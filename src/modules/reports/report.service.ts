import { prisma } from '@/shared/database/client';
import type { Category, FinancialAccount, FinancialTransaction } from '@prisma/client';
import { getRealBalance } from '@/modules/financial-engine/financial-engine.service';
import { resolveMonthPeriod } from '@/shared/period';
import { groupMovementsByMonth } from './report-grouping';
import type { ReportMonthGroup, ReportMovement } from './report-grouping';

export interface ReportFilters {
  from: Date;
  to: Date;
  categoryId?: string;
  accountId?: string;
  tagId?: string;
  status?: 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
  /** Natureza (Seção 94). Quando categoryId está setado, esta é a mesma opção da Seção 95 (Todos/Receitas/Despesas). */
  type?: 'INCOME' | 'EXPENSE';
}

export interface CategoryReportSummary {
  categoryName: string;
  incomeCents: number;
  expenseCents: number;
  netResultCents: number;
  incomeCount: number;
  expenseCount: number;
  monthlyEvolution: { monthLabel: string; netCents: number }[];
}

export interface ReportResult {
  months: ReportMonthGroup[];
  totalIncomeCents: number;
  totalExpenseCents: number;
  totalResultCents: number;
  /** Saldo geral (pedido do cliente) — saldo real atual da conta, dá contexto ao período analisado. */
  currentRealBalanceCents: number;
  categorySummary: CategoryReportSummary | null;
}

/**
 * Relatórios (Seção 94-98). Filtros: mês/período, categoria, conta, tag,
 * status, natureza. Sempre agrupado por mês (Seção 94, pedido do cliente:
 * período de mais de um mês vem dividido por mês). Quando uma categoria é
 * selecionada, o resumo específico da Seção 96 é calculado junto.
 */
export async function buildReport(tenantId: string, filters: ReportFilters): Promise<ReportResult> {
  const transactions = await prisma.financialTransaction.findMany({
    where: {
      tenantId,
      dueDate: { gte: filters.from, lte: filters.to },
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.tagId ? { tags: { some: { tagId: filters.tagId } } } : {}),
    },
    include: { category: true, account: true },
    orderBy: { dueDate: 'asc' },
  });

  const movements: ReportMovement[] = transactions.map(
    (
      transaction: FinancialTransaction & { category: Category | null; account: FinancialAccount },
    ) => ({
      id: transaction.id,
      type: transaction.type,
      description: transaction.description,
      amountCents: transaction.amountCents,
      dueDate: transaction.dueDate,
      status: transaction.status,
      categoryName: transaction.category?.name ?? null,
      accountName: transaction.account.name,
    }),
  );

  const months = groupMovementsByMonth(movements);

  const totalIncomeCents = months.reduce((sum, month) => sum + month.incomeCents, 0);
  const totalExpenseCents = months.reduce((sum, month) => sum + month.expenseCents, 0);

  const currentRealBalanceCents = await getRealBalance(tenantId);

  let categorySummary: CategoryReportSummary | null = null;
  if (filters.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: filters.categoryId, tenantId },
    });
    if (category) {
      const activeMovements = movements.filter((movement) => movement.status !== 'CANCELLED');
      const incomeMovements = activeMovements.filter((movement) => movement.type === 'INCOME');
      const expenseMovements = activeMovements.filter((movement) => movement.type === 'EXPENSE');
      const incomeCents = incomeMovements.reduce((sum, movement) => sum + movement.amountCents, 0);
      const expenseCents = expenseMovements.reduce(
        (sum, movement) => sum + movement.amountCents,
        0,
      );

      categorySummary = {
        categoryName: category.name,
        incomeCents,
        expenseCents,
        netResultCents: incomeCents - expenseCents,
        incomeCount: incomeMovements.length,
        expenseCount: expenseMovements.length,
        monthlyEvolution: months.map((month) => ({
          monthLabel: month.monthLabel,
          netCents: month.resultCents,
        })),
      };
    }
  }

  return {
    months,
    totalIncomeCents,
    totalExpenseCents,
    totalResultCents: totalIncomeCents - totalExpenseCents,
    currentRealBalanceCents,
    categorySummary,
  };
}

export interface ReportSearchParams {
  mes?: string;
  de?: string;
  ate?: string;
  categoria?: string;
  conta?: string;
  tag?: string;
  status?: string;
  natureza?: string;
}

export interface ReportFilterSummary {
  periodLabel: string;
  categoryLabel?: string;
  accountLabel?: string;
  tagLabel?: string;
  statusLabel?: string;
  natureLabel?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

/**
 * Traduz os parâmetros de busca da URL (compartilhados entre a página e as
 * duas rotas de exportação — PDF e Excel precisam refletir exatamente os
 * mesmos filtros vistos na tela, Seção 100/101) em filtros de consulta +
 * rótulos legíveis para exibir no cabeçalho do relatório.
 */
export async function resolveReportFilters(
  tenantId: string,
  searchParams: ReportSearchParams,
): Promise<{ filters: ReportFilters; summary: ReportFilterSummary }> {
  const period = resolveMonthPeriod(searchParams);

  const filters: ReportFilters = {
    from: period.from,
    to: period.to,
    categoryId: searchParams.categoria || undefined,
    accountId: searchParams.conta || undefined,
    tagId: searchParams.tag || undefined,
    status: (searchParams.status as ReportFilters['status']) || undefined,
    type: (searchParams.natureza as ReportFilters['type']) || undefined,
  };

  const [category, account, tag] = await Promise.all([
    filters.categoryId
      ? prisma.category.findFirst({ where: { id: filters.categoryId, tenantId } })
      : null,
    filters.accountId
      ? prisma.financialAccount.findFirst({ where: { id: filters.accountId, tenantId } })
      : null,
    filters.tagId ? prisma.tag.findFirst({ where: { id: filters.tagId, tenantId } }) : null,
  ]);

  const periodFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });
  const periodLabel = `${periodFormatter.format(period.from)} a ${periodFormatter.format(period.to)}`;

  const summary: ReportFilterSummary = {
    periodLabel,
    categoryLabel: category?.name,
    accountLabel: account?.name,
    tagLabel: tag?.name,
    statusLabel: filters.status ? STATUS_LABELS[filters.status] : undefined,
    natureLabel: filters.type ? (filters.type === 'INCOME' ? 'Receitas' : 'Despesas') : undefined,
  };

  return { filters, summary };
}
