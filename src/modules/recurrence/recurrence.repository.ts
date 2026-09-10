import { prisma } from '@/shared/database/client';
import type { FinancialTransactionType, RecurrenceFrequency, RecurrenceKind } from '@prisma/client';

export async function findSeriesById(tenantId: string, seriesId: string) {
  return prisma.recurrenceSeries.findFirst({ where: { id: seriesId, tenantId } });
}

export async function listActiveSeries(tenantId: string) {
  return prisma.recurrenceSeries.findMany({ where: { tenantId, active: true } });
}

interface CreateSeriesInput {
  kind: RecurrenceKind;
  transactionType?: FinancialTransactionType;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  baseAmountCents: number;
  description?: string;
  defaultAccountId?: string;
  defaultCategoryId?: string;
  defaultReminderEnabled?: boolean;
  defaultNote?: string;
  defaultAffectsBalance?: boolean;
  defaultTagIds?: string[];
  defaultSourceAccountId?: string;
  defaultDestinationAccountId?: string;
}

export async function createSeries(tenantId: string, input: CreateSeriesInput) {
  return prisma.recurrenceSeries.create({
    data: {
      tenantId,
      kind: input.kind,
      transactionType: input.transactionType,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      startDate: input.startDate,
      endDate: input.endDate,
      maxOccurrences: input.maxOccurrences,
      baseAmountCents: input.baseAmountCents,
      description: input.description,
      defaultAccountId: input.defaultAccountId,
      defaultCategoryId: input.defaultCategoryId,
      defaultReminderEnabled: input.defaultReminderEnabled ?? false,
      defaultNote: input.defaultNote,
      defaultAffectsBalance: input.defaultAffectsBalance ?? true,
      defaultSourceAccountId: input.defaultSourceAccountId,
      defaultDestinationAccountId: input.defaultDestinationAccountId,
      defaultTags:
        input.defaultTagIds && input.defaultTagIds.length > 0
          ? { create: input.defaultTagIds.map((tagId) => ({ tagId })) }
          : undefined,
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
  defaultSourceAccountId?: string;
  defaultDestinationAccountId?: string;
  defaultNote?: string | null;
  defaultAffectsBalance?: boolean;
}

export async function updateSeriesBase(
  tenantId: string,
  seriesId: string,
  input: UpdateSeriesBaseInput,
) {
  return prisma.recurrenceSeries.updateMany({ where: { id: seriesId, tenantId }, data: input });
}
