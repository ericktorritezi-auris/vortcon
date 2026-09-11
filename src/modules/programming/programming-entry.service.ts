import type { FinancialTransactionType } from '@prisma/client';
import { prisma } from '@/shared/database/client';

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

interface CreateEntryInput {
  type: FinancialTransactionType;
  originId?: string;
  beneficiaryId: string;
  description: string;
  amountCents: number;
  entryDate: Date;
}

/**
 * Lançamento avulso (Seção 12-16) — nunca influencia saldo, resultado,
 * relatório ou o Financial Engine (Seção 1: "PROGRAMAR NÃO É MOVIMENTAR").
 * Só cria o registro de controle; o efeito financeiro só existe depois de
 * "Gerar transação" (Seção 36-40).
 */
export async function createEntry(tenantId: string, input: CreateEntryInput) {
  if (input.originId) await assertOriginOwnedByTenant(tenantId, input.originId);
  await assertBeneficiaryOwnedByTenant(tenantId, input.beneficiaryId);

  return prisma.programmingEntry.create({
    data: {
      tenantId,
      type: input.type,
      originId: input.originId,
      beneficiaryId: input.beneficiaryId,
      description: input.description,
      amountCents: input.amountCents,
      entryDate: input.entryDate,
    },
  });
}

interface UpdateEntryInput {
  originId?: string | null;
  beneficiaryId?: string;
  description?: string;
  amountCents?: number;
  entryDate?: Date;
}

/**
 * Editar (Seção 24-26) — SEMPRE só esta ocorrência isolada, nunca a série
 * (isso é "alterar recorrência", uma ação diferente e explícita). Nunca
 * permite editar uma ocorrência já convertida (Seção 44: editar a
 * Programação depois de gerada a Transação não faz sentido — os domínios
 * já são independentes; se precisar mudar valor, edita a Transação).
 */
export async function updateEntry(tenantId: string, entryId: string, input: UpdateEntryInput) {
  const entry = await prisma.programmingEntry.findFirst({ where: { id: entryId, tenantId } });
  if (!entry) throw new Error('Lançamento não encontrado neste tenant.');
  if (entry.convertedAt) {
    throw new Error(
      'Este lançamento já gerou uma transação — edite a transação, não a programação.',
    );
  }

  if (input.originId) await assertOriginOwnedByTenant(tenantId, input.originId);
  if (input.beneficiaryId) await assertBeneficiaryOwnedByTenant(tenantId, input.beneficiaryId);

  return prisma.programmingEntry.updateMany({
    where: { id: entryId, tenantId },
    data: {
      originId: input.originId,
      beneficiaryId: input.beneficiaryId,
      description: input.description,
      amountCents: input.amountCents,
      entryDate: input.entryDate,
    },
  });
}

/**
 * Cancelar (Seção 28) — reversível, preserva o registro. O cancelamento
 * de uma ocorrência recorrente NUNCA cancela a série inteira (Seção 28).
 * Permitido mesmo já convertida (Seção 45) — a Transação gerada nunca é
 * tocada por isso.
 */
export async function cancelEntry(tenantId: string, entryId: string) {
  return prisma.programmingEntry.updateMany({
    where: { id: entryId, tenantId, status: 'ACTIVE' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}

/**
 * Reativar (Seção 29) — nunca permitido se já convertida, pra nunca
 * arriscar ficar elegível de novo pra "Gerar transação" de forma confusa
 * ("nunca permitir reativação que provoque duplicidade financeira").
 */
export async function reactivateEntry(tenantId: string, entryId: string): Promise<void> {
  const entry = await prisma.programmingEntry.findFirst({ where: { id: entryId, tenantId } });
  if (!entry) throw new Error('Lançamento não encontrado neste tenant.');
  if (entry.convertedAt) {
    throw new Error('Este lançamento já gerou uma transação — não pode ser reativado.');
  }

  await prisma.programmingEntry.updateMany({
    where: { id: entryId, tenantId, status: 'CANCELLED' },
    data: { status: 'ACTIVE', cancelledAt: null },
  });
}

/**
 * Excluir de verdade (Seção 30-31) — padrão idêntico ao de
 * `deleteTransaction`: só depois de cancelado. Camada extra aqui (Seção
 * 31): NUNCA excluir se já converteu em transação, mesmo cancelado —
 * isso destruiria a rastreabilidade de "qual Programação originou qual
 * Transação". Nesse caso, cancelar é o máximo que se pode fazer.
 */
export async function deleteEntry(tenantId: string, entryId: string): Promise<void> {
  const entry = await prisma.programmingEntry.findFirst({ where: { id: entryId, tenantId } });
  if (!entry) throw new Error('Lançamento não encontrado neste tenant.');

  if (entry.status !== 'CANCELLED') {
    throw new Error('Só é possível excluir um lançamento cancelado.');
  }
  if (entry.convertedAt) {
    throw new Error(
      'Este lançamento já gerou uma transação — a rastreabilidade precisa ser preservada, por isso não pode ser excluído (só cancelado).',
    );
  }

  await prisma.programmingEntry.delete({ where: { id: entryId } });
}

/** Lançamentos de um mês (Seção 13) — base pra tela de Lançamentos, agrupada por beneficiário na UI. */
export async function listEntriesForMonth(tenantId: string, from: Date, to: Date) {
  const entries = await prisma.programmingEntry.findMany({
    where: { tenantId, entryDate: { gte: from, lte: to } },
    include: { origin: true, beneficiary: true },
    orderBy: { entryDate: 'asc' },
  });

  // Posição X/N (Seção 18) — só mostra o denominador quando a série tem
  // maxOccurrences explícito (nunca "inventar" um total pra série sem fim
  // ou limitada só por data). Uma query por série única presente no mês,
  // nunca uma por lançamento.
  const seriesIds = [
    ...new Set(
      entries
        .map((e: (typeof entries)[number]) => e.recurrenceSeriesId)
        .filter((id: string | null): id is string => id !== null),
    ),
  ];
  if (seriesIds.length === 0) {
    return entries.map((entry: (typeof entries)[number]) => ({ ...entry, seriesPosition: null }));
  }

  const seriesList = await prisma.programmingRecurrenceSeries.findMany({
    where: { id: { in: seriesIds } },
    select: { id: true, maxOccurrences: true },
  });
  const maxOccurrencesBySeriesId = new Map(
    seriesList.map((s: { id: string; maxOccurrences: number | null }) => [s.id, s.maxOccurrences]),
  );

  const allSeriesEntries = await prisma.programmingEntry.findMany({
    where: { recurrenceSeriesId: { in: seriesIds } },
    select: { id: true, recurrenceSeriesId: true, entryDate: true },
    orderBy: { entryDate: 'asc' },
  });
  const orderedIdsBySeriesId = new Map<string, string[]>();
  for (const e of allSeriesEntries) {
    const list = orderedIdsBySeriesId.get(e.recurrenceSeriesId!) ?? [];
    list.push(e.id);
    orderedIdsBySeriesId.set(e.recurrenceSeriesId!, list);
  }

  return entries.map((entry: (typeof entries)[number]) => {
    if (!entry.recurrenceSeriesId) return { ...entry, seriesPosition: null };

    const orderedIds = orderedIdsBySeriesId.get(entry.recurrenceSeriesId) ?? [];
    const total = maxOccurrencesBySeriesId.get(entry.recurrenceSeriesId) ?? null;
    const current = orderedIds.indexOf(entry.id) + 1;

    return { ...entry, seriesPosition: { current, total } };
  });
}
