import { prisma } from '@/shared/database/client';
import { activeTransactionWhere } from './financial-exclusions';

/**
 * Financial Engine (Seção 63). Único núcleo de cálculo financeiro do
 * sistema — Dashboard, Cockpit, Reports e Insight Engine (estágios
 * futuros) consomem estas funções, nunca reimplementam a matemática.
 *
 * Metodologia normativa (Seção 58):
 * - Saldo real: saldo inicial + receitas recebidas - despesas pagas ±
 *   transferências concluídas. Pendências nunca alteram saldo real.
 * - Resultado do período: por vencimento/competência, independente da
 *   liquidação (uma despesa que vence em setembro e é paga em outubro
 *   pertence ao resultado de setembro, mas ao caixa de outubro).
 * - Saldo projetado: saldo real + receitas pendentes esperadas - despesas
 *   pendentes esperadas.
 */

export interface AccountBalance {
  accountId: string;
  balanceCents: number;
}

export async function getAccountBalances(tenantId: string): Promise<AccountBalance[]> {
  const accounts = await prisma.financialAccount.findMany({
    where: { tenantId, active: true },
    select: { id: true, initialBalanceCents: true },
  });

  const balances = await Promise.all(
    accounts.map(
      async (account: { id: string; initialBalanceCents: number }): Promise<AccountBalance> => {
        const [incomeReceived, expensePaid, transfersIn, transfersOut] = await Promise.all([
          prisma.financialTransaction.aggregate({
            where: activeTransactionWhere(tenantId, {
              accountId: account.id,
              type: 'INCOME',
              status: 'RECEIVED',
            }),
            _sum: { amountCents: true },
          }),
          prisma.financialTransaction.aggregate({
            where: activeTransactionWhere(tenantId, {
              accountId: account.id,
              type: 'EXPENSE',
              status: 'PAID',
            }),
            _sum: { amountCents: true },
          }),
          prisma.transfer.aggregate({
            where: { tenantId, destinationAccountId: account.id, status: 'COMPLETED' },
            _sum: { amountCents: true },
          }),
          prisma.transfer.aggregate({
            where: { tenantId, sourceAccountId: account.id, status: 'COMPLETED' },
            _sum: { amountCents: true },
          }),
        ]);

        const balanceCents =
          account.initialBalanceCents +
          (incomeReceived._sum.amountCents ?? 0) -
          (expensePaid._sum.amountCents ?? 0) +
          (transfersIn._sum.amountCents ?? 0) -
          (transfersOut._sum.amountCents ?? 0);

        return { accountId: account.id, balanceCents };
      },
    ),
  );

  return balances;
}

export async function getRealBalance(tenantId: string): Promise<number> {
  const balances = await getAccountBalances(tenantId);
  return balances.reduce((total, account) => total + account.balanceCents, 0);
}

interface Period {
  from: Date;
  to: Date;
}

export async function getPeriodIncome(tenantId: string, period: Period): Promise<number> {
  const result = await prisma.financialTransaction.aggregate({
    where: activeTransactionWhere(tenantId, {
      type: 'INCOME',
      dueDate: { gte: period.from, lte: period.to },
    }),
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

export async function getPeriodExpenses(tenantId: string, period: Period): Promise<number> {
  const result = await prisma.financialTransaction.aggregate({
    where: activeTransactionWhere(tenantId, {
      type: 'EXPENSE',
      dueDate: { gte: period.from, lte: period.to },
    }),
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

export async function getPeriodResult(tenantId: string, period: Period): Promise<number> {
  const [income, expenses] = await Promise.all([
    getPeriodIncome(tenantId, period),
    getPeriodExpenses(tenantId, period),
  ]);
  return income - expenses;
}

export async function getPendingPayables(tenantId: string): Promise<number> {
  const result = await prisma.financialTransaction.aggregate({
    where: activeTransactionWhere(tenantId, { type: 'EXPENSE', status: 'PENDING' }),
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

export async function getPendingReceivables(tenantId: string): Promise<number> {
  const result = await prisma.financialTransaction.aggregate({
    where: activeTransactionWhere(tenantId, { type: 'INCOME', status: 'PENDING' }),
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

export async function getProjectedBalance(tenantId: string): Promise<number> {
  const [realBalance, pendingReceivables, pendingPayables] = await Promise.all([
    getRealBalance(tenantId),
    getPendingReceivables(tenantId),
    getPendingPayables(tenantId),
  ]);
  return realBalance + pendingReceivables - pendingPayables;
}

export type BreakdownView = 'ALL_MOVEMENT' | 'INCOME_ONLY' | 'EXPENSE_ONLY';

export interface CategoryBreakdownRow {
  categoryId: string;
  incomeTotalCents: number;
  expenseTotalCents: number;
  netResultCents: number;
  incomeCount: number;
  expenseCount: number;
}

/**
 * getCategoryBreakdown nunca assume categoria de despesa (Seção 64) — o
 * merge abaixo trata as duas naturezas com o mesmo peso, categoria por
 * categoria, independente de qual lado (ou os dois) ela tem movimento.
 */
export async function getCategoryBreakdown(
  tenantId: string,
  period: Period,
  view: BreakdownView = 'ALL_MOVEMENT',
): Promise<CategoryBreakdownRow[]> {
  const baseWhere = { dueDate: { gte: period.from, lte: period.to } };

  const [incomeGroups, expenseGroups] = await Promise.all([
    view === 'EXPENSE_ONLY'
      ? []
      : prisma.financialTransaction.groupBy({
          by: ['categoryId'],
          where: activeTransactionWhere(tenantId, { ...baseWhere, type: 'INCOME' }),
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
    view === 'INCOME_ONLY'
      ? []
      : prisma.financialTransaction.groupBy({
          by: ['categoryId'],
          where: activeTransactionWhere(tenantId, { ...baseWhere, type: 'EXPENSE' }),
          _sum: { amountCents: true },
          _count: { _all: true },
        }),
  ]);

  const rows = new Map<string, CategoryBreakdownRow>();

  for (const group of incomeGroups) {
    if (!group.categoryId) continue;
    rows.set(group.categoryId, {
      categoryId: group.categoryId,
      incomeTotalCents: group._sum.amountCents ?? 0,
      expenseTotalCents: 0,
      netResultCents: group._sum.amountCents ?? 0,
      incomeCount: group._count._all,
      expenseCount: 0,
    });
  }

  for (const group of expenseGroups) {
    if (!group.categoryId) continue;
    const existing = rows.get(group.categoryId);
    const expenseTotalCents = group._sum.amountCents ?? 0;
    if (existing) {
      existing.expenseTotalCents = expenseTotalCents;
      existing.expenseCount = group._count._all;
      existing.netResultCents = existing.incomeTotalCents - expenseTotalCents;
    } else {
      rows.set(group.categoryId, {
        categoryId: group.categoryId,
        incomeTotalCents: 0,
        expenseTotalCents: expenseTotalCents,
        netResultCents: -expenseTotalCents,
        incomeCount: 0,
        expenseCount: group._count._all,
      });
    }
  }

  return Array.from(rows.values());
}

export interface TagBreakdownRow {
  tagId: string;
  incomeTotalCents: number;
  expenseTotalCents: number;
  netResultCents: number;
  movementCount: number;
}

interface TagLinkForBreakdown {
  tagId: string;
  transaction: { type: 'INCOME' | 'EXPENSE'; amountCents: number };
}

/**
 * getTagBreakdown (Seção 63, 65) — mesmo princípio de getCategoryBreakdown,
 * mas agregado via `financial_transaction_tags` (relação N:N, não um campo
 * escalar) — por isso não dá pra usar `groupBy` direto do Prisma aqui; a
 * agregação acontece em JS, volume esperado por tenant é baixo o bastante
 * para isso ser seguro (mesmo padrão já usado em `getDailyTotals`).
 */
export async function getTagBreakdown(
  tenantId: string,
  period: Period,
  view: BreakdownView = 'ALL_MOVEMENT',
): Promise<TagBreakdownRow[]> {
  const links: TagLinkForBreakdown[] = await prisma.financialTransactionTag.findMany({
    where: {
      transaction: activeTransactionWhere(tenantId, {
        dueDate: { gte: period.from, lte: period.to },
      }),
    },
    select: {
      tagId: true,
      transaction: { select: { type: true, amountCents: true } },
    },
  });

  const rows = new Map<string, TagBreakdownRow>();

  for (const link of links) {
    if (view === 'INCOME_ONLY' && link.transaction.type !== 'INCOME') continue;
    if (view === 'EXPENSE_ONLY' && link.transaction.type !== 'EXPENSE') continue;

    const row = rows.get(link.tagId) ?? {
      tagId: link.tagId,
      incomeTotalCents: 0,
      expenseTotalCents: 0,
      netResultCents: 0,
      movementCount: 0,
    };

    if (link.transaction.type === 'INCOME') {
      row.incomeTotalCents += link.transaction.amountCents;
    } else {
      row.expenseTotalCents += link.transaction.amountCents;
    }
    row.netResultCents = row.incomeTotalCents - row.expenseTotalCents;
    row.movementCount += 1;

    rows.set(link.tagId, row);
  }

  return Array.from(rows.values());
}

export interface EntityFlow {
  incomeTotalCents: number;
  expenseTotalCents: number;
  netResultCents: number;
  incomeCount: number;
  expenseCount: number;
}

/** Fluxo completo de UMA categoria (Seção 44, 64) — entradas, saídas, resultado líquido. */
export async function getCategoryFlow(
  tenantId: string,
  categoryId: string,
  period: Period,
): Promise<EntityFlow> {
  const baseWhere = { categoryId, dueDate: { gte: period.from, lte: period.to } };

  const [income, expense] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: activeTransactionWhere(tenantId, { ...baseWhere, type: 'INCOME' }),
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.financialTransaction.aggregate({
      where: activeTransactionWhere(tenantId, { ...baseWhere, type: 'EXPENSE' }),
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
  ]);

  const incomeTotalCents = income._sum.amountCents ?? 0;
  const expenseTotalCents = expense._sum.amountCents ?? 0;

  return {
    incomeTotalCents,
    expenseTotalCents,
    netResultCents: incomeTotalCents - expenseTotalCents,
    incomeCount: income._count._all,
    expenseCount: expense._count._all,
  };
}

/** Mesmo princípio de getCategoryFlow, para uma tag (Seção 65, 53). */
export async function getTagFlow(
  tenantId: string,
  tagId: string,
  period: Period,
): Promise<EntityFlow> {
  const baseWhere = {
    dueDate: { gte: period.from, lte: period.to },
    tags: { some: { tagId } },
  };

  const [income, expense] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: activeTransactionWhere(tenantId, { ...baseWhere, type: 'INCOME' }),
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.financialTransaction.aggregate({
      where: activeTransactionWhere(tenantId, { ...baseWhere, type: 'EXPENSE' }),
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
  ]);

  const incomeTotalCents = income._sum.amountCents ?? 0;
  const expenseTotalCents = expense._sum.amountCents ?? 0;

  return {
    incomeTotalCents,
    expenseTotalCents,
    netResultCents: incomeTotalCents - expenseTotalCents,
    incomeCount: income._count._all,
    expenseCount: expense._count._all,
  };
}

export interface DailyTotal {
  date: string;
  incomeTotalCents: number;
  expenseTotalCents: number;
}

/** Totais diários (para gráficos - Estágio 10+). Agregado em JS por simplicidade; volume baixo por tenant. */
export async function getDailyTotals(tenantId: string, period: Period): Promise<DailyTotal[]> {
  const transactions = await prisma.financialTransaction.findMany({
    where: activeTransactionWhere(tenantId, { dueDate: { gte: period.from, lte: period.to } }),
    select: { type: true, amountCents: true, dueDate: true },
  });

  const byDate = new Map<string, DailyTotal>();

  for (const transaction of transactions) {
    const key = transaction.dueDate.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { date: key, incomeTotalCents: 0, expenseTotalCents: 0 };

    if (transaction.type === 'INCOME') {
      entry.incomeTotalCents += transaction.amountCents;
    } else {
      entry.expenseTotalCents += transaction.amountCents;
    }

    byDate.set(key, entry);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface MonthlyEvolution {
  month: string;
  incomeTotalCents: number;
  expenseTotalCents: number;
  resultCents: number;
}

/** Evolução mensal dos últimos monthsBack meses, incluindo o atual. */
export async function getMonthlyEvolution(
  tenantId: string,
  monthsBack: number,
): Promise<MonthlyEvolution[]> {
  const now = new Date();
  const results: MonthlyEvolution[] = [];

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));

    const [income, expense] = await Promise.all([
      getPeriodIncome(tenantId, { from: monthStart, to: monthEnd }),
      getPeriodExpenses(tenantId, { from: monthStart, to: monthEnd }),
    ]);

    results.push({
      month: monthStart.toISOString().slice(0, 7),
      incomeTotalCents: income,
      expenseTotalCents: expense,
      resultCents: income - expense,
    });
  }

  return results;
}
