import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { computeOccurrenceDates, toOccurrenceKey } from './date-sequence';
import * as recurrenceRepository from './recurrence.repository';

// Seção 75: "janela futura razoável, nunca infinita". Achado real
// (pedido do cliente): 90 dias era curto demais pra um app de finanças
// pessoais — uma recorrência de 5-6 meses (comum: financiamento, parcela)
// ficava truncada, sumindo mês a mês conforme a janela original (90 dias
// = ~3 meses) não alcançava o fim da série. Aumentado pra 400 dias
// (~13 meses) — cobre qualquer recorrência de até um ano de antecedência
// de uma vez, continua bem longe de "infinito" pra series sem data de
// término. A materialização é idempotente e aditiva (nunca duplica, nunca
// mexe no que já existe) — esse aumento só passa a preencher, sozinho, os
// meses que antes ficavam de fora, sem precisar relançar nada.
const MATERIALIZATION_WINDOW_DAYS = 400;

async function assertAccountOwnedByTenant(tenantId: string, accountId: string): Promise<void> {
  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) throw new Error('Conta não encontrada neste tenant.');
}

async function assertCategoryOwnedByTenant(tenantId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) throw new Error('Categoria não encontrada neste tenant.');
}

async function assertTagsOwnedByTenant(tenantId: string, tagIds: string[]): Promise<void> {
  if (tagIds.length === 0) return;
  const count = await prisma.tag.count({ where: { id: { in: tagIds }, tenantId } });
  if (count !== new Set(tagIds).size)
    throw new Error('Uma ou mais tags não pertencem a este tenant.');
}

interface CreateTransactionSeriesInput {
  kind: 'TRANSACTION';
  transactionType: 'INCOME' | 'EXPENSE';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';
  interval?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  baseAmountCents: number;
  description?: string;
  defaultAccountId: string;
  defaultCategoryId?: string;
  defaultReminderEnabled?: boolean;
  // Bug real corrigido (pedido do cliente) — antes a série nunca
  // propagava nota nem tags pras ocorrências materializadas, só a
  // descrição. Agora propaga os três.
  defaultNote?: string;
  defaultAffectsBalance?: boolean;
  defaultTagIds?: string[];
}

interface CreateTransferSeriesInput {
  kind: 'TRANSFER';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';
  interval?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  baseAmountCents: number;
  description?: string;
  defaultSourceAccountId: string;
  defaultDestinationAccountId: string;
}

type CreateSeriesInput = CreateTransactionSeriesInput | CreateTransferSeriesInput;

/**
 * Cria a série e já materializa a primeira janela de ocorrências (Seção
 * 75). Aceita dois tipos (`kind`): TRANSACTION e TRANSFER. Nunca aceita os
 * dois grupos de campos ao mesmo tempo — o discriminador `kind` decide
 * qual validação roda.
 */
export async function createRecurrenceSeries(tenantId: string, input: CreateSeriesInput) {
  if (input.kind === 'TRANSACTION') {
    await assertAccountOwnedByTenant(tenantId, input.defaultAccountId);
    if (input.defaultCategoryId) {
      await assertCategoryOwnedByTenant(tenantId, input.defaultCategoryId);
    }
    if (input.defaultTagIds && input.defaultTagIds.length > 0) {
      await assertTagsOwnedByTenant(tenantId, input.defaultTagIds);
    }
  } else {
    if (input.defaultSourceAccountId === input.defaultDestinationAccountId) {
      throw new Error('A conta de origem e destino não podem ser a mesma.');
    }
    await assertAccountOwnedByTenant(tenantId, input.defaultSourceAccountId);
    await assertAccountOwnedByTenant(tenantId, input.defaultDestinationAccountId);
  }

  const series = await recurrenceRepository.createSeries(tenantId, input);
  await materializeSeriesOccurrences(tenantId, series.id);

  return series;
}

/**
 * Materializa ocorrências pendentes de UMA série dentro da janela futura
 * (Seção 75). Idempotente: nunca duplica (a constraint única em
 * [recurrenceSeriesId, recurrenceOccurrenceKey] garante isso mesmo em
 * corrida — este check prévio só evita uma query de INSERT desnecessária).
 * Ramifica por `kind`: TRANSACTION cria FinancialTransaction; TRANSFER cria
 * Transfer — mesmo padrão de idempotência nos dois.
 */
export async function materializeSeriesOccurrences(
  tenantId: string,
  seriesId: string,
): Promise<number> {
  const series = await recurrenceRepository.findSeriesById(tenantId, seriesId);
  if (!series || !series.active) return 0;

  const windowEnd = new Date(Date.now() + MATERIALIZATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const occurrenceDates = computeOccurrenceDates(
    {
      frequency: series.frequency,
      interval: series.interval,
      startDate: series.startDate,
      endDate: series.endDate,
      maxOccurrences: series.maxOccurrences,
    },
    windowEnd,
  );

  if (series.kind === 'TRANSFER') {
    const existingKeys = new Set(
      (
        await prisma.transfer.findMany({
          where: { recurrenceSeriesId: seriesId },
          select: { recurrenceOccurrenceKey: true },
        })
      ).map((row: { recurrenceOccurrenceKey: string | null }) => row.recurrenceOccurrenceKey),
    );

    const pendingDates = occurrenceDates.filter((date) => !existingKeys.has(toOccurrenceKey(date)));
    if (pendingDates.length === 0) return 0;

    await prisma.transfer.createMany({
      data: pendingDates.map((date) => ({
        tenantId,
        sourceAccountId: series.defaultSourceAccountId!,
        destinationAccountId: series.defaultDestinationAccountId!,
        amountCents: series.baseAmountCents,
        scheduledDate: date,
        note: series.description,
        recurrenceSeriesId: seriesId,
        recurrenceOccurrenceKey: toOccurrenceKey(date),
      })),
      skipDuplicates: true,
    });

    return pendingDates.length;
  }

  const existingKeys = new Set(
    (
      await prisma.financialTransaction.findMany({
        where: { recurrenceSeriesId: seriesId },
        select: { recurrenceOccurrenceKey: true },
      })
    ).map((row: { recurrenceOccurrenceKey: string | null }) => row.recurrenceOccurrenceKey),
  );

  const pendingDates = occurrenceDates.filter((date) => !existingKeys.has(toOccurrenceKey(date)));
  if (pendingDates.length === 0) return 0;

  // Tags padrão da série (Seção "correção de bug" — nunca eram
  // propagadas antes). createMany não aceita relação aninhada, então
  // criamos as transações primeiro e ligamos as tags depois, usando a
  // recurrenceOccurrenceKey (única por série) pra identificar cada uma
  // que acabamos de criar.
  const defaultTags = await prisma.recurrenceSeriesTag.findMany({
    where: { recurrenceSeriesId: seriesId },
    select: { tagId: true },
  });

  await prisma.financialTransaction.createMany({
    data: pendingDates.map((date) => ({
      tenantId,
      type: series.transactionType!,
      description: series.description ?? `Recorrência — ${date.toISOString().slice(0, 10)}`,
      amountCents: series.baseAmountCents,
      dueDate: date,
      accountId: series.defaultAccountId!,
      categoryId: series.defaultCategoryId,
      reminderEnabled: series.defaultReminderEnabled,
      note: series.defaultNote,
      affectsBalance: series.defaultAffectsBalance,
      recurrenceSeriesId: seriesId,
      recurrenceOccurrenceKey: toOccurrenceKey(date),
    })),
    skipDuplicates: true,
  });

  if (defaultTags.length > 0) {
    const createdOccurrences = await prisma.financialTransaction.findMany({
      where: {
        recurrenceSeriesId: seriesId,
        recurrenceOccurrenceKey: { in: pendingDates.map((date) => toOccurrenceKey(date)) },
      },
      select: { id: true },
    });

    await prisma.financialTransactionTag.createMany({
      data: createdOccurrences.flatMap((occurrence: { id: string }) =>
        defaultTags.map((tag: { tagId: string }) => ({
          transactionId: occurrence.id,
          tagId: tag.tagId,
        })),
      ),
      skipDuplicates: true,
    });
  }

  return pendingDates.length;
}

/** Job idempotente (Seção 75) — materializa todas as séries ativas do tenant. Seguro de rodar repetidamente. */
export async function materializeAllActiveSeries(tenantId: string): Promise<void> {
  const seriesList = await recurrenceRepository.listActiveSeries(tenantId);
  for (const series of seriesList) {
    await materializeSeriesOccurrences(tenantId, series.id);
  }
}

interface AlterFutureOccurrencesInput {
  baseAmountCents?: number;
  defaultAccountId?: string;
  defaultCategoryId?: string;
  // Pedido do cliente — "posso excluir nos lançamentos futuros essa
  // observação, ou uma flag pra ela ir ou não pra lançamentos futuros".
  // Implementado reaproveitando o mecanismo já existente de "alterar
  // recorrência pra frente" (Seção 73) — nunca um mecanismo paralelo.
  // `defaultNote: null` remove a observação de todas as ocorrências
  // futuras elegíveis; uma string nova troca; `undefined` não mexe.
  defaultNote?: string | null;
  defaultAffectsBalance?: boolean;
}

/**
 * "Alterar recorrência" (Seção 73) — ação explícita e distinta de editar
 * uma ocorrência isolada (Seção 72). Muda o padrão da série E as
 * ocorrências futuras ELEGÍVEIS (já materializadas, ainda PENDING, com
 * vencimento no futuro) — nunca reescreve liquidadas, canceladas ou
 * históricas (Seção 73: "nunca reescrever"). Só se aplica a séries de
 * transação — transferência recorrente altera só valor/contas via
 * `updateSeriesBase` direto, sem essa propagação retroativa (V1).
 */
export async function alterRecurrenceForward(
  tenantId: string,
  seriesId: string,
  input: AlterFutureOccurrencesInput,
): Promise<{ updatedOccurrences: number }> {
  if (input.defaultAccountId) await assertAccountOwnedByTenant(tenantId, input.defaultAccountId);
  if (input.defaultCategoryId) await assertCategoryOwnedByTenant(tenantId, input.defaultCategoryId);

  await recurrenceRepository.updateSeriesBase(tenantId, seriesId, input);

  const result = await prisma.financialTransaction.updateMany({
    where: {
      tenantId,
      recurrenceSeriesId: seriesId,
      status: 'PENDING',
      dueDate: { gt: new Date() },
    },
    data: {
      ...(input.baseAmountCents !== undefined ? { amountCents: input.baseAmountCents } : {}),
      ...(input.defaultAccountId ? { accountId: input.defaultAccountId } : {}),
      ...(input.defaultCategoryId !== undefined ? { categoryId: input.defaultCategoryId } : {}),
      ...(input.defaultNote !== undefined ? { note: input.defaultNote } : {}),
      ...(input.defaultAffectsBalance !== undefined
        ? { affectsBalance: input.defaultAffectsBalance }
        : {}),
    },
  });

  return { updatedOccurrences: result.count };
}

export async function endRecurrenceSeries(
  tenantId: string,
  seriesId: string,
  endDate: Date = new Date(),
) {
  return recurrenceRepository.endSeries(tenantId, seriesId, endDate);
}

/**
 * Excluir uma série inteira + TODAS as suas ocorrências materializadas,
 * de qualquer status (pendente, paga, cancelada) — pedido explícito do
 * cliente: "quero recomeçar do zero". Diferente de `deleteTransaction`
 * (que só exclui uma transação isolada, e só depois de cancelada) — essa
 * é uma ação de reset em massa, consentida explicitamente na tela de
 * gestão de recorrências, nunca disparada sem confirmação clara.
 */
export async function deleteSeriesWithOccurrences(
  tenantId: string,
  seriesId: string,
): Promise<{ deletedOccurrences: number }> {
  const series = await recurrenceRepository.findSeriesById(tenantId, seriesId);
  if (!series) throw new Error('Série não encontrada neste tenant.');

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let deletedOccurrences = 0;

    if (series.kind === 'TRANSFER') {
      const result = await tx.transfer.deleteMany({
        where: { recurrenceSeriesId: seriesId, tenantId },
      });
      deletedOccurrences = result.count;
    } else {
      await tx.financialTransactionTag.deleteMany({
        where: { transaction: { recurrenceSeriesId: seriesId, tenantId } },
      });
      const result = await tx.financialTransaction.deleteMany({
        where: { recurrenceSeriesId: seriesId, tenantId },
      });
      deletedOccurrences = result.count;
    }

    await tx.recurrenceSeriesTag.deleteMany({ where: { recurrenceSeriesId: seriesId } });
    await tx.recurrenceSeries.delete({ where: { id: seriesId } });

    return { deletedOccurrences };
  });
}
