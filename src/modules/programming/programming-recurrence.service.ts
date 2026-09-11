import type { FinancialTransactionType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { computeOccurrenceDates, toOccurrenceKey } from '@/modules/recurrence/date-sequence';

// Mesma janela do domínio financeiro (Seção 75 lá, reaproveitada aqui —
// Seção 21 aqui pede reaproveitar "filosofia atual do VortCon pra séries
// recorrentes"). Ver src/modules/recurrence/recurrence.service.ts pro
// histórico completo de por que 400 dias.
const MATERIALIZATION_WINDOW_DAYS = 400;

async function assertOriginOwnedByTenant(tenantId: string, originId: string): Promise<void> {
  const origin = await prisma.programmingOrigin.findFirst({ where: { id: originId, tenantId } });
  if (!origin) throw new Error('Origem não encontrada neste tenant.');
}

async function assertBeneficiaryOwnedByTenant(
  tenantId: string,
  beneficiaryId: string,
): Promise<void> {
  const beneficiary = await prisma.programmingBeneficiary.findFirst({
    where: { id: beneficiaryId, tenantId },
  });
  if (!beneficiary) throw new Error('Beneficiário não encontrado neste tenant.');
}

interface CreateProgrammingSeriesInput {
  type: FinancialTransactionType;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';
  interval?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  baseAmountCents: number;
  description: string;
  defaultOriginId?: string;
  defaultBeneficiaryId: string;
}

/**
 * Série de recorrência de Programações (Seção 17-19) — domínio
 * completamente separado de `RecurrenceSeries` (financeiro). Cria a série
 * e já materializa a primeira janela de ocorrências, mesmo comportamento
 * do domínio financeiro (Seção 21: "reutilizar filosofia atual").
 */
export async function createProgrammingSeries(
  tenantId: string,
  input: CreateProgrammingSeriesInput,
) {
  if (input.defaultOriginId) await assertOriginOwnedByTenant(tenantId, input.defaultOriginId);
  await assertBeneficiaryOwnedByTenant(tenantId, input.defaultBeneficiaryId);

  const series = await prisma.programmingRecurrenceSeries.create({
    data: {
      tenantId,
      type: input.type,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      startDate: input.startDate,
      endDate: input.endDate,
      maxOccurrences: input.maxOccurrences,
      baseAmountCents: input.baseAmountCents,
      description: input.description,
      defaultOriginId: input.defaultOriginId,
      defaultBeneficiaryId: input.defaultBeneficiaryId,
    },
  });

  await materializeProgrammingSeriesOccurrences(tenantId, series.id);
  return series;
}

/**
 * Materializa ocorrências pendentes (Seção 21). Idempotente: a
 * constraint única em [recurrenceSeriesId, recurrenceOccurrenceKey]
 * garante nunca duplicar, mesmo em corrida — igual ao domínio financeiro.
 * Seção 33: uma ocorrência deliberadamente cancelada/excluída nunca
 * reaparece — o mesmo occurrenceKey nunca "renasce" porque a chave em si
 * é a data, e o check de existência abaixo olha TODAS as ocorrências já
 * criadas pra esta série (independente de status atual), nunca só as
 * ativas.
 */
export async function materializeProgrammingSeriesOccurrences(
  tenantId: string,
  seriesId: string,
): Promise<number> {
  const series = await prisma.programmingRecurrenceSeries.findFirst({
    where: { id: seriesId, tenantId },
  });
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

  const existingKeys = new Set(
    (
      await prisma.programmingEntry.findMany({
        where: { recurrenceSeriesId: seriesId },
        select: { recurrenceOccurrenceKey: true },
      })
    ).map((row: { recurrenceOccurrenceKey: string | null }) => row.recurrenceOccurrenceKey),
  );

  const pendingDates = occurrenceDates.filter((date) => !existingKeys.has(toOccurrenceKey(date)));
  if (pendingDates.length === 0) return 0;

  await prisma.programmingEntry.createMany({
    data: pendingDates.map((date) => ({
      tenantId,
      type: series.type,
      originId: series.defaultOriginId,
      beneficiaryId: series.defaultBeneficiaryId,
      description: series.description,
      amountCents: series.baseAmountCents,
      entryDate: date,
      recurrenceSeriesId: seriesId,
      recurrenceOccurrenceKey: toOccurrenceKey(date),
    })),
    skipDuplicates: true,
  });

  return pendingDates.length;
}

/** Job idempotente — materializa todas as séries ativas do tenant (mesmo padrão do financeiro). */
export async function materializeAllProgrammingSeries(tenantId: string): Promise<void> {
  const seriesList = await prisma.programmingRecurrenceSeries.findMany({
    where: { tenantId, active: true },
  });
  for (const series of seriesList) {
    await materializeProgrammingSeriesOccurrences(tenantId, series.id);
  }
}

interface AlterProgrammingSeriesInput {
  baseAmountCents?: number;
  defaultOriginId?: string | null;
  defaultBeneficiaryId?: string;
}

/**
 * "Alterar recorrência" (Seção 27) — muda o padrão da série e as
 * ocorrências futuras ELEGÍVEIS (ainda ACTIVE, não convertidas, com data
 * no futuro) — nunca reescreve histórico nem ocorrência já convertida em
 * transação (Seção 27: "nunca alterar retroativamente uma ocorrência que
 * já tenha sido utilizada para gerar uma Transação Financeira").
 */
export async function alterProgrammingSeriesForward(
  tenantId: string,
  seriesId: string,
  input: AlterProgrammingSeriesInput,
): Promise<{ updatedOccurrences: number }> {
  if (input.defaultOriginId) await assertOriginOwnedByTenant(tenantId, input.defaultOriginId);
  if (input.defaultBeneficiaryId)
    await assertBeneficiaryOwnedByTenant(tenantId, input.defaultBeneficiaryId);

  await prisma.programmingRecurrenceSeries.updateMany({
    where: { id: seriesId, tenantId },
    data: {
      baseAmountCents: input.baseAmountCents,
      defaultOriginId: input.defaultOriginId,
      defaultBeneficiaryId: input.defaultBeneficiaryId,
    },
  });

  const result = await prisma.programmingEntry.updateMany({
    where: {
      tenantId,
      recurrenceSeriesId: seriesId,
      status: 'ACTIVE',
      convertedAt: null,
      entryDate: { gt: new Date() },
    },
    data: {
      ...(input.baseAmountCents !== undefined ? { amountCents: input.baseAmountCents } : {}),
      ...(input.defaultOriginId !== undefined ? { originId: input.defaultOriginId } : {}),
      ...(input.defaultBeneficiaryId ? { beneficiaryId: input.defaultBeneficiaryId } : {}),
    },
  });

  return { updatedOccurrences: result.count };
}

export async function endProgrammingSeries(
  tenantId: string,
  seriesId: string,
  endDate: Date = new Date(),
) {
  return prisma.programmingRecurrenceSeries.updateMany({
    where: { id: seriesId, tenantId },
    data: { active: false, endDate },
  });
}

/**
 * Lista todas as séries do tenant (Seção 19-22 — "administrar a série
 * sem precisar operar ocorrência por ocorrência"), com contagem de
 * ocorrências — base da tela Programações > Recorrências. Mesmo padrão
 * de `listAllSeriesForTenant` do domínio financeiro.
 */
export async function listAllProgrammingSeries(tenantId: string) {
  const series = await prisma.programmingRecurrenceSeries.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  });

  const beneficiaryIds = series.map((s: (typeof series)[number]) => s.defaultBeneficiaryId);
  const beneficiaries = await prisma.programmingBeneficiary.findMany({
    where: { id: { in: beneficiaryIds } },
    select: { id: true, name: true },
  });
  const beneficiaryNameById = new Map(
    beneficiaries.map((b: { id: string; name: string }) => [b.id, b.name]),
  );

  return series.map((s: (typeof series)[number]) => ({
    id: s.id,
    type: s.type,
    description: s.description,
    frequency: s.frequency,
    interval: s.interval,
    startDate: s.startDate,
    endDate: s.endDate,
    active: s.active,
    occurrenceCount: s._count.entries,
    beneficiaryName: beneficiaryNameById.get(s.defaultBeneficiaryId) ?? '—',
  }));
}

/**
 * Excluir uma série inteira (Seção 32) — PRESERVA ocorrências já
 * convertidas em transação (nunca as apaga, nunca desfaz o vínculo).
 * Ocorrências ainda não convertidas são removidas junto com a série
 * (Seção 32: "ocorrências futuras ainda não convertidas podem ser
 * removidas conforme a operação escolhida").
 */
export async function deleteProgrammingSeriesWithOccurrences(
  tenantId: string,
  seriesId: string,
): Promise<{ deletedOccurrences: number; preservedConvertedOccurrences: number }> {
  const series = await prisma.programmingRecurrenceSeries.findFirst({
    where: { id: seriesId, tenantId },
  });
  if (!series) throw new Error('Série não encontrada neste tenant.');

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const preserved = await tx.programmingEntry.count({
      where: { recurrenceSeriesId: seriesId, convertedAt: { not: null } },
    });

    // Nunca convertidas — podem ser removidas junto com a série de verdade.
    const deleted = await tx.programmingEntry.deleteMany({
      where: { recurrenceSeriesId: seriesId, convertedAt: null },
    });

    // Ocorrências já convertidas ficam soltas (recurrenceSeriesId -> null),
    // preservando a transação gerada e a rastreabilidade, mesmo com a
    // série excluída.
    await tx.programmingEntry.updateMany({
      where: { recurrenceSeriesId: seriesId, convertedAt: { not: null } },
      data: { recurrenceSeriesId: null, recurrenceOccurrenceKey: null },
    });

    await tx.programmingRecurrenceSeries.delete({ where: { id: seriesId } });

    return { deletedOccurrences: deleted.count, preservedConvertedOccurrences: preserved };
  });
}
