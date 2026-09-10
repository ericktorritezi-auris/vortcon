import { prisma } from '@/shared/database/client';
import type { FinancialTransactionType, RecurrenceFrequency, RecurrenceKind } from '@prisma/client';

export async function findSeriesById(tenantId: string, seriesId: string) {
  return prisma.recurrenceSeries.findFirst({ where: { id: seriesId, tenantId } });
}

export async function listActiveSeries(tenantId: string) {
  return prisma.recurrenceSeries.findMany({ where: { tenantId, active: true } });
}

/**
 * Lista TODAS as séries do tenant (ativas e encerradas), com a contagem de
 * ocorrências já materializadas — base da tela de gestão de recorrências
 * (pedido do cliente: "quero ver todas de uma vez e poder excluir em
 * massa").
 */
export async function listAllSeriesForTenant(tenantId: string) {
  const series = await prisma.recurrenceSeries.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { occurrences: true, transfers: true } },
    },
  });

  const accountIds = new Set<string>();
  for (const s of series) {
    if (s.defaultAccountId) accountIds.add(s.defaultAccountId);
    if (s.defaultSourceAccountId) accountIds.add(s.defaultSourceAccountId);
    if (s.defaultDestinationAccountId) accountIds.add(s.defaultDestinationAccountId);
  }
  const accounts = await prisma.financialAccount.findMany({
    where: { id: { in: [...accountIds] } },
    select: { id: true, name: true },
  });
  const accountNameById = new Map(
    accounts.map((a: { id: string; name: string }) => [a.id, a.name]),
  );

  return series.map((s: (typeof series)[number]) => ({
    id: s.id,
    kind: s.kind,
    transactionType: s.transactionType,
    description: s.description,
    frequency: s.frequency,
    interval: s.interval,
    startDate: s.startDate,
    endDate: s.endDate,
    active: s.active,
    occurrenceCount: s._count.occurrences + s._count.transfers,
    accountName:
      accountNameById.get(s.defaultAccountId ?? '') ??
      (s.defaultSourceAccountId && s.defaultDestinationAccountId
        ? `${accountNameById.get(s.defaultSourceAccountId) ?? '—'} → ${accountNameById.get(s.defaultDestinationAccountId) ?? '—'}`
        : null),
  }));
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
