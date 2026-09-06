import { prisma } from '@/shared/database/client';
import { computeOccurrenceDates, toOccurrenceKey } from './date-sequence';
import * as recurrenceRepository from './recurrence.repository';

const MATERIALIZATION_WINDOW_DAYS = 90; // Seção 75: janela futura razoável, nunca infinita.

async function assertOwnedByTenant(
  tenantId: string,
  accountId: string,
  categoryId?: string,
): Promise<void> {
  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) throw new Error('Conta não encontrada neste tenant.');

  if (categoryId) {
    const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!category) throw new Error('Categoria não encontrada neste tenant.');
  }
}

interface CreateSeriesInput {
  transactionType: 'INCOME' | 'EXPENSE';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';
  interval?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  baseAmountCents: number;
  defaultAccountId: string;
  defaultCategoryId?: string;
  defaultReminderEnabled?: boolean;
}

/** Cria a série e já materializa a primeira janela de ocorrências (Seção 75). */
export async function createRecurrenceSeries(tenantId: string, input: CreateSeriesInput) {
  await assertOwnedByTenant(tenantId, input.defaultAccountId, input.defaultCategoryId);

  const series = await recurrenceRepository.createSeries(tenantId, input);
  await materializeSeriesOccurrences(tenantId, series.id);

  return series;
}

/**
 * Materializa ocorrências pendentes de UMA série dentro da janela futura
 * (Seção 75). Idempotente: nunca duplica (a constraint única em
 * [recurrenceSeriesId, recurrenceOccurrenceKey] garante isso mesmo em
 * corrida — este check prévio só evita uma query de INSERT desnecessária).
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
      type: series.transactionType,
      description: `Recorrência — ${date.toISOString().slice(0, 10)}`,
      amountCents: series.baseAmountCents,
      dueDate: date,
      accountId: series.defaultAccountId,
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
 * históricas (Seção 73: "nunca reescrever").
 */
export async function alterRecurrenceForward(
  tenantId: string,
  seriesId: string,
  input: AlterFutureOccurrencesInput,
): Promise<{ updatedOccurrences: number }> {
  if (input.defaultAccountId || input.defaultCategoryId) {
    await assertOwnedByTenant(
      tenantId,
      input.defaultAccountId ??
        (await recurrenceRepository.findSeriesById(tenantId, seriesId))!.defaultAccountId,
      input.defaultCategoryId,
    );
  }

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
