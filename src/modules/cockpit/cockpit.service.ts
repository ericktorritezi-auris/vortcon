import { prisma } from '@/shared/database/client';
import {
  getBalanceAsOf,
  getCategoryBreakdown,
  getPeriodExpenses,
  getPeriodIncome,
} from '@/modules/financial-engine/financial-engine.service';
import type { CategoryBreakdownRow } from '@/modules/financial-engine/financial-engine.service';
import { selectCategoryHighlights } from './cockpit-highlights';
import type { CategoryHighlights } from './cockpit-highlights';

interface MonthBoundaries {
  from: Date;
  to: Date;
  endOfPreviousDay: Date;
}

/**
 * Calcula as bordas do mês (Seção 86). endOfPreviousDay é o último
 * instante do dia anterior ao 1º do mês - usado para "saldo inicial",
 * garantindo que nenhuma liquidação do dia 1º entre por engano no saldo
 * de abertura.
 */
function monthBoundaries(monthStart: Date): MonthBoundaries {
  const from = monthStart;
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const endOfPreviousDay = new Date(from.getTime() - 1);
  return { from, to, endOfPreviousDay };
}

export interface CockpitSummary {
  initialBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  finalPositionCents: number;
  previousMonth: {
    incomeCents: number;
    expenseCents: number;
    resultCents: number;
  };
  categoryHighlights: CategoryHighlights;
  /** Movimentação do mês por categoria — base para o gráfico de pizza (despesas/receitas por categoria, a pedido do cliente). */
  categoryBreakdown: CategoryBreakdownRow[];
}

/**
 * Cockpit (Seção 86-88) - resumo mensal completo. Sempre recomputado ao
 * vivo a partir do estado atual do banco, nunca um snapshot congelado
 * (Seção 88: "correção histórica recalcula Cockpit" - editar uma transação
 * de um mês fechado precisa refletir aqui na próxima consulta, sem
 * nenhuma ação extra de "recalcular").
 */
export async function getCockpitSummary(
  tenantId: string,
  monthStart: Date,
): Promise<CockpitSummary> {
  const { from, to, endOfPreviousDay } = monthBoundaries(monthStart);
  const previousMonthStart = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1));
  const previousMonthBoundaries = monthBoundaries(previousMonthStart);

  const [
    initialBalanceCents,
    incomeCents,
    expenseCents,
    finalPositionCents,
    currentCategoryBreakdown,
    previousIncomeCents,
    previousExpenseCents,
    previousCategoryBreakdown,
  ] = await Promise.all([
    getBalanceAsOf(tenantId, endOfPreviousDay),
    getPeriodIncome(tenantId, { from, to }),
    getPeriodExpenses(tenantId, { from, to }),
    getBalanceAsOf(tenantId, to),
    getCategoryBreakdown(tenantId, { from, to }, 'ALL_MOVEMENT'),
    getPeriodIncome(tenantId, {
      from: previousMonthBoundaries.from,
      to: previousMonthBoundaries.to,
    }),
    getPeriodExpenses(tenantId, {
      from: previousMonthBoundaries.from,
      to: previousMonthBoundaries.to,
    }),
    getCategoryBreakdown(
      tenantId,
      { from: previousMonthBoundaries.from, to: previousMonthBoundaries.to },
      'ALL_MOVEMENT',
    ),
  ]);

  const categoryHighlights = selectCategoryHighlights(
    currentCategoryBreakdown,
    previousCategoryBreakdown,
  );

  return {
    initialBalanceCents,
    incomeCents,
    expenseCents,
    resultCents: incomeCents - expenseCents,
    finalPositionCents,
    previousMonth: {
      incomeCents: previousIncomeCents,
      expenseCents: previousExpenseCents,
      resultCents: previousIncomeCents - previousExpenseCents,
    },
    categoryHighlights,
    categoryBreakdown: currentCategoryBreakdown,
  };
}

/**
 * Virada do mês (Seção 89): "no primeiro acesso" ao Cockpit depois que um
 * mês fechou, mostrar o aviso - só para o mês IMEDIATAMENTE anterior ao
 * atual, e só se ainda não foi confirmado. Não empilha avisos de vários
 * meses atrasados de propósito - manter simples (Seção 0).
 */
export async function findUnacknowledgedPreviousMonth(tenantId: string): Promise<Date | null> {
  const now = new Date();
  const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const acknowledgement = await prisma.cockpitAcknowledgement.findUnique({
    where: { tenantId_month: { tenantId, month: previousMonthStart } },
  });

  if (acknowledgement) return null;

  return previousMonthStart;
}

export async function acknowledgeMonth(tenantId: string, month: Date): Promise<void> {
  await prisma.cockpitAcknowledgement.upsert({
    where: { tenantId_month: { tenantId, month } },
    create: { tenantId, month },
    update: {},
  });
}
