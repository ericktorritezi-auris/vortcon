import { describe, expect, it } from 'vitest';
import { selectCategoryHighlights } from './cockpit-highlights';

describe('selectCategoryHighlights (Seção 87)', () => {
  it('identifica a categoria com maior saída e a com maior entrada', () => {
    const current = [
      {
        categoryId: 'moradia',
        incomeTotalCents: 0,
        expenseTotalCents: 150000,
        netResultCents: -150000,
      },
      {
        categoryId: 'salario',
        incomeTotalCents: 500000,
        expenseTotalCents: 0,
        netResultCents: 500000,
      },
      {
        categoryId: 'lazer',
        incomeTotalCents: 0,
        expenseTotalCents: 20000,
        netResultCents: -20000,
      },
    ];

    const highlights = selectCategoryHighlights(current, []);
    expect(highlights.biggestExpenseCategoryId).toBe('moradia');
    expect(highlights.biggestIncomeCategoryId).toBe('salario');
  });

  it('identifica maior resultado líquido positivo e negativo', () => {
    const current = [
      {
        categoryId: 'a',
        incomeTotalCents: 100000,
        expenseTotalCents: 30000,
        netResultCents: 70000,
      },
      {
        categoryId: 'b',
        incomeTotalCents: 200000,
        expenseTotalCents: 50000,
        netResultCents: 150000,
      },
      { categoryId: 'c', incomeTotalCents: 0, expenseTotalCents: 90000, netResultCents: -90000 },
    ];

    const highlights = selectCategoryHighlights(current, []);
    expect(highlights.biggestPositiveNetCategoryId).toBe('b');
    expect(highlights.biggestNegativeNetCategoryId).toBe('c');
  });

  it('categoria sem nenhuma despesa nunca é escolhida como maior saída (evita falso positivo em zero)', () => {
    const current = [
      {
        categoryId: 'so_receita',
        incomeTotalCents: 100000,
        expenseTotalCents: 0,
        netResultCents: 100000,
      },
    ];

    const highlights = selectCategoryHighlights(current, []);
    expect(highlights.biggestExpenseCategoryId).toBeNull();
  });

  it('detecta categorias que cresceram em despesa comparado ao mês anterior', () => {
    const current = [
      {
        categoryId: 'moradia',
        incomeTotalCents: 0,
        expenseTotalCents: 150000,
        netResultCents: -150000,
      },
      { categoryId: 'lazer', incomeTotalCents: 0, expenseTotalCents: 5000, netResultCents: -5000 },
    ];
    const previous = [
      {
        categoryId: 'moradia',
        incomeTotalCents: 0,
        expenseTotalCents: 100000,
        netResultCents: -100000,
      },
      { categoryId: 'lazer', incomeTotalCents: 0, expenseTotalCents: 8000, netResultCents: -8000 },
    ];

    const highlights = selectCategoryHighlights(current, previous);
    expect(highlights.expenseGrowthCategoryIds).toEqual(['moradia']);
    expect(highlights.expenseGrowthCategoryIds).not.toContain('lazer');
  });

  it('categoria nova (sem histórico no mês anterior) conta como crescimento a partir de zero', () => {
    const current = [
      { categoryId: 'nova', incomeTotalCents: 0, expenseTotalCents: 10000, netResultCents: -10000 },
    ];

    const highlights = selectCategoryHighlights(current, []);
    expect(highlights.expenseGrowthCategoryIds).toEqual(['nova']);
  });

  it('Seção 87 — "não presumir que categoria pertence só a um lado": mesma categoria pode ser maior saída E crescer em receita', () => {
    const current = [
      {
        categoryId: 'emprestimo',
        incomeTotalCents: 300000,
        expenseTotalCents: 500000,
        netResultCents: -200000,
      },
    ];
    const previous = [
      {
        categoryId: 'emprestimo',
        incomeTotalCents: 100000,
        expenseTotalCents: 500000,
        netResultCents: -400000,
      },
    ];

    const highlights = selectCategoryHighlights(current, previous);
    expect(highlights.biggestExpenseCategoryId).toBe('emprestimo');
    expect(highlights.incomeGrowthCategoryIds).toContain('emprestimo');
  });

  it('lista vazia produz destaques todos nulos/vazios, sem lançar erro', () => {
    const highlights = selectCategoryHighlights([], []);
    expect(highlights.biggestExpenseCategoryId).toBeNull();
    expect(highlights.biggestIncomeCategoryId).toBeNull();
    expect(highlights.biggestPositiveNetCategoryId).toBeNull();
    expect(highlights.biggestNegativeNetCategoryId).toBeNull();
    expect(highlights.expenseGrowthCategoryIds).toEqual([]);
    expect(highlights.incomeGrowthCategoryIds).toEqual([]);
  });
});
