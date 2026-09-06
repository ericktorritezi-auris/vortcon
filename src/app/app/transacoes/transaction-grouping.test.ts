import { describe, expect, it } from 'vitest';
import { groupByDay } from './transaction-grouping';

describe('agrupamento por dia (Seção 77)', () => {
  it('agrupa transações do mesmo dia e calcula o total corretamente', () => {
    const groups = groupByDay([
      { id: '1', type: 'EXPENSE', amountCents: 28500, dueDate: '2026-09-30', status: 'PENDING' },
      { id: '2', type: 'INCOME', amountCents: 500000, dueDate: '2026-09-30', status: 'RECEIVED' },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[0]?.totalCents).toBe(500000 - 28500);
  });

  it('ordena os dias do mais recente para o mais antigo', () => {
    const groups = groupByDay([
      { id: '1', type: 'EXPENSE', amountCents: 1000, dueDate: '2026-09-01', status: 'PENDING' },
      { id: '2', type: 'EXPENSE', amountCents: 1000, dueDate: '2026-09-15', status: 'PENDING' },
      { id: '3', type: 'EXPENSE', amountCents: 1000, dueDate: '2026-09-30', status: 'PENDING' },
    ]);

    expect(groups.map((group) => group.key)).toEqual(['2026-09-30', '2026-09-15', '2026-09-01']);
  });

  it('transação cancelada nunca conta no total do dia (Seção 59)', () => {
    const groups = groupByDay([
      { id: '1', type: 'EXPENSE', amountCents: 100000, dueDate: '2026-09-05', status: 'CANCELLED' },
      { id: '2', type: 'INCOME', amountCents: 5000, dueDate: '2026-09-05', status: 'RECEIVED' },
    ]);

    expect(groups[0]?.totalCents).toBe(5000);
  });

  it('rótulo do dia começa com letra maiúscula', () => {
    const groups = groupByDay([
      { id: '1', type: 'EXPENSE', amountCents: 1000, dueDate: '2026-09-30', status: 'PENDING' },
    ]);

    expect(groups[0]?.label[0]).toBe(groups[0]?.label[0]?.toUpperCase());
  });

  it('lista vazia produz nenhum grupo', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
