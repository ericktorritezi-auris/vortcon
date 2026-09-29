import { describe, expect, it } from 'vitest';
import {
  computeSimulationSummary,
  filterSimulationTransactions,
  type SimulationTransaction,
} from './simulation-calculations';

const TRANSACTIONS: SimulationTransaction[] = [
  {
    id: 't1',
    type: 'INCOME',
    status: 'RECEIVED',
    amountCents: 420000,
    categoryId: 'cat-salario',
    accountId: 'acc-1',
  },
  {
    id: 't2',
    type: 'EXPENSE',
    status: 'PAID',
    amountCents: 135000,
    categoryId: 'cat-moradia',
    accountId: 'acc-1',
  },
  {
    id: 't3',
    type: 'EXPENSE',
    status: 'PENDING',
    amountCents: 38000,
    categoryId: 'cat-alimentacao',
    accountId: 'acc-2',
  },
  {
    id: 't4',
    type: 'INCOME',
    status: 'PENDING',
    amountCents: 65000,
    categoryId: 'cat-trabalho-extra',
    accountId: 'acc-1',
  },
  {
    id: 't5',
    type: 'EXPENSE',
    status: 'CANCELLED',
    amountCents: 5590,
    categoryId: 'cat-moradia',
    accountId: 'acc-2',
  },
];

describe('filterSimulationTransactions', () => {
  it('sem filtro (tudo em ALL) retorna a lista inteira, incluindo canceladas', () => {
    const result = filterSimulationTransactions(TRANSACTIONS, {
      type: 'ALL',
      categoryId: 'ALL',
      accountId: 'ALL',
      status: 'ALL',
    });
    expect(result).toHaveLength(5);
  });

  it('filtra por tipo', () => {
    const result = filterSimulationTransactions(TRANSACTIONS, {
      type: 'INCOME',
      categoryId: 'ALL',
      accountId: 'ALL',
      status: 'ALL',
    });
    expect(result.map((t) => t.id)).toEqual(['t1', 't4']);
  });

  it('filtra por categoria', () => {
    const result = filterSimulationTransactions(TRANSACTIONS, {
      type: 'ALL',
      categoryId: 'cat-moradia',
      accountId: 'ALL',
      status: 'ALL',
    });
    expect(result.map((t) => t.id)).toEqual(['t2', 't5']);
  });

  it('filtra por conta', () => {
    const result = filterSimulationTransactions(TRANSACTIONS, {
      type: 'ALL',
      categoryId: 'ALL',
      accountId: 'acc-2',
      status: 'ALL',
    });
    expect(result.map((t) => t.id)).toEqual(['t3', 't5']);
  });

  it('filtra por status, incluindo CANCELLED como opção válida', () => {
    const result = filterSimulationTransactions(TRANSACTIONS, {
      type: 'ALL',
      categoryId: 'ALL',
      accountId: 'ALL',
      status: 'CANCELLED',
    });
    expect(result.map((t) => t.id)).toEqual(['t5']);
  });

  it('combina múltiplos filtros (E lógico entre eles)', () => {
    const result = filterSimulationTransactions(TRANSACTIONS, {
      type: 'EXPENSE',
      categoryId: 'cat-moradia',
      accountId: 'acc-1',
      status: 'ALL',
    });
    expect(result.map((t) => t.id)).toEqual(['t2']);
  });
});

describe('computeSimulationSummary', () => {
  it('sem seleção, todos os totais ficam zerados', () => {
    const summary = computeSimulationSummary(TRANSACTIONS, []);
    expect(summary).toEqual({ incomeSumCents: 0, expenseSumCents: 0, netCents: 0, items: [] });
  });

  it('soma receitas e despesas selecionadas separadamente e calcula o líquido', () => {
    const summary = computeSimulationSummary(TRANSACTIONS, ['t1', 't2', 't4']);
    expect(summary.incomeSumCents).toBe(485000); // t1 + t4
    expect(summary.expenseSumCents).toBe(135000); // t2
    expect(summary.netCents).toBe(350000);
  });

  it('o acumulado (runningNetCents) cresce na ORDEM de seleção, não na ordem da lista original', () => {
    // Seleciona despesa primeiro, depois receita — o acumulado tem que
    // refletir essa ordem: -1350 primeiro, depois +2850 (linha "100, +100,
    // 200..." que o cliente pediu para ver).
    const summary = computeSimulationSummary(TRANSACTIONS, ['t2', 't1']);
    expect(summary.items).toEqual([
      { id: 't2', signedCents: -135000, runningNetCents: -135000 },
      { id: 't1', signedCents: 420000, runningNetCents: 285000 },
    ]);
  });

  it('ignora um id selecionado que não existe mais na lista, sem quebrar a soma dos demais', () => {
    const summary = computeSimulationSummary(TRANSACTIONS, ['t1', 'id-inexistente', 't2']);
    expect(summary.incomeSumCents).toBe(420000);
    expect(summary.expenseSumCents).toBe(135000);
    expect(summary.items.map((item) => item.id)).toEqual(['t1', 't2']);
  });

  it('uma transação CANCELLED selecionada ainda entra na soma (a tela deixa o usuário decidir, não filtra por trás)', () => {
    const summary = computeSimulationSummary(TRANSACTIONS, ['t5']);
    expect(summary.expenseSumCents).toBe(5590);
    expect(summary.netCents).toBe(-5590);
  });
});
