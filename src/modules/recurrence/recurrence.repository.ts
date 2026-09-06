import { prisma } from '@/shared/database/client';
import type { FinancialTransactionType, RecurrenceFrequency } from '@prisma/client';

export async function findSeriesById(tenantId: string, seriesId: string) {
  return prisma.recurrenceSeries.findFirst({ where: { id: seriesId, tenantId } });
}

export async function listActiveSeries(tenantId: string) {
  return prisma.recurrenceSeries.findMany({ where: { tenantId, active: true } });
}

interface CreateSeriesInput {
  transactionType: FinancialTransactionType;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  baseAmountCents: number;
  defaultAccountId: string;
  defaultCategoryId?: string;
  defaultReminderEnabled?: boolean;
}

export async function createSeries(tenantId: string, input: CreateSeriesInput) {
  return prisma.recurrenceSeries.create({
    data: {
      tenantId,
      transactionType: input.transactionType,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      startDate: input.startDate,
      endDate: input.endDate,
      maxOccurrences: input.maxOccurrences,
      baseAmountCents: input.baseAmountCents,
      defaultAccountId: input.defaultAccountId,
      defaultCategoryId: input.defaultCategoryId,
      defaultReminderEnabled: input.defaultReminderEnabled ?? false,
    },
  });
}

/** Encerrar recorrência (Seção 74) — para de gerar novas ocorrências; as já materializadas permanecem intactas. */
export async function endSeries(tenantId: string, seriesId: string, endDate: Date) {
  return prisma.recurrenceSeries.updateMany({
    where: { id: seriesId, tenantId },
    data: { active: false, endDate },
  });
}

interface UpdateSeriesBaseInput {
  baseAmountCents?: number;
  defaultAccountId?: string;
  defaultCategoryId?: string;
}

export async function updateSeriesBase(
  tenantId: string,
  seriesId: string,
  input: UpdateSeriesBaseInput,
) {
  return prisma.recurrenceSeries.updateMany({ where: { id: seriesId, tenantId }, data: input });
}
