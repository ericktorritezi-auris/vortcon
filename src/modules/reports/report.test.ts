import { describe, expect, it } from 'vitest';
import { groupMovementsByMonth } from './report-grouping';
import { sanitizeExcelCell } from './excel-sanitize';

const baseMovement = {
  id: '1',
  type: 'EXPENSE' as const,
  description: 'Teste',
  status: 'PENDING' as const,
  categoryName: null,
  accountName: 'Conta',
};

describe('groupMovementsByMonth (Seção 94)', () => {
  it('agrupa movimentações de meses diferentes em grupos separados, ordenados cronologicamente', () => {
    const groups = groupMovementsByMonth([
      { ...baseMovement, id: '1', amountCents: 1000, dueDate: '2026-09-05' },
      { ...baseMovement, id: '2', amountCents: 1000, dueDate: '2026-08-10' },
    ]);

    expect(groups.map((g) => g.monthKey)).toEqual(['2026-08', '2026-09']);
    expect(groups[0]?.monthLabel).toBe('Agosto/2026');
    expect(groups[1]?.monthLabel).toBe('Setembro/2026');
  });

  it('calcula receitas, despesas e resultado corretamente por mês', () => {
    const groups = groupMovementsByMonth([
      { ...baseMovement, id: '1', type: 'INCOME', amountCents: 500000, dueDate: '2026-09-05' },
      { ...baseMovement, id: '2', type: 'EXPENSE', amountCents: 200000, dueDate: '2026-09-10' },
    ]);

    expect(groups[0]?.incomeCents).toBe(500000);
    expect(groups[0]?.expenseCents).toBe(200000);
    expect(groups[0]?.resultCents).toBe(300000);
  });

  it('transação cancelada nunca conta no total, mas continua na lista de movimentações', () => {
    const groups = groupMovementsByMonth([
      {
        ...baseMovement,
        id: '1',
        type: 'EXPENSE',
        amountCents: 100000,
        status: 'CANCELLED',
        dueDate: '2026-09-05',
      },
      { ...baseMovement, id: '2', type: 'INCOME', amountCents: 5000, dueDate: '2026-09-05' },
    ]);

    expect(groups[0]?.expenseCents).toBe(0);
    expect(groups[0]?.incomeCents).toBe(5000);
    expect(groups[0]?.movements).toHaveLength(2);
  });

  it('lista vazia produz nenhum grupo', () => {
    expect(groupMovementsByMonth([])).toEqual([]);
  });
});

describe('sanitizeExcelCell (Seção 101 — proteção contra formula injection)', () => {
  it('prefixa com apóstrofo valores que começam com =', () => {
    expect(sanitizeExcelCell('=cmd|"/c calc"!A1')).toBe('\'=cmd|"/c calc"!A1');
  });

  it('prefixa valores que começam com +, -, @', () => {
    expect(sanitizeExcelCell('+1+1')).toBe("'+1+1");
    expect(sanitizeExcelCell('-1+1')).toBe("'-1+1");
    expect(sanitizeExcelCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('texto normal nunca é alterado', () => {
    expect(sanitizeExcelCell('Aluguel de setembro')).toBe('Aluguel de setembro');
  });

  it('string vazia não quebra', () => {
    expect(sanitizeExcelCell('')).toBe('');
  });
});
