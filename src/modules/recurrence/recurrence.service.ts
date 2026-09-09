import { prisma } from '@/shared/database/client';
import { computeOccurrenceDates, toOccurrenceKey } from './date-sequence';
import * as recurrenceRepository from './recurrence.repository';

const MATERIALIZATION_WINDOW_DAYS = 90; // Seção 75: janela futura razoável, nunca infinita.

async function assertAccountOwnedByTenant(tenantId: string, accountId: string): Promise<void> {
  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) throw new Error('Conta não encontrada neste tenant.');
}

async function assertCategoryOwnedByTenant(tenantId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) throw new Error('Categoria não encontrada neste tenant.');
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
 * 75). Estágio 16C — agora aceita dois tipos (`kind`): TRANSACTION (o que
 * já existia) e TRANSFER (novo — transferência recorrente, ex.: aporte
 * mensal automático entre contas). Nunca aceita os dois grupos de campos
 * ao mesmo tempo — o discriminador `kind` decide qual validação roda.
 */
export async function createRecurrenceSeries(tenantId: string, input: CreateSeriesInput) {
  if (input.kind === 'TRANSACTION') {
    await assertAccountOwnedByTenant(tenantId, input.defaultAccountId);
    if (input.defaultCategoryId)
      await assertCategoryOwnedByTenant(tenantId, input.defaultCategoryId);
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
 * Ramifica por `kind`: TRANSACTION cria FinancialTransaction (como sempre
 * fez); TRANSFER cria Transfer — lógica nova do Estágio 16C, seguindo
 * exatamente o mesmo padrão de idempotência.
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
      recurrenceSeriesId: seriesId,
      recurrenceOccurrenceKey: toOccurrenceKey(date),
    })),
    skipDuplicates: true,
  });

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
