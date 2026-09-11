import { describe, expect, it } from 'vitest';
import { groupEntriesByBeneficiary } from './entry-grouping';
import type { EntryView } from './entry-grouping';

function makeEntry(
  overrides: Partial<EntryView> &
    Pick<EntryView, 'id' | 'beneficiaryId' | 'beneficiaryName' | 'type' | 'amountCents'>,
): EntryView {
  return {
    description: 'Teste',
    entryDate: '2026-09-10',
    status: 'ACTIVE',
    originName: null,
    convertedAt: null,
    seriesPosition: null,
    ...overrides,
  };
}

describe('groupEntriesByBeneficiary (Seção 34-35)', () => {
  it('agrupa por beneficiário, nunca por data', () => {
    const entries = [
      makeEntry({
        id: '1',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'INCOME',
        amountCents: 500,
      }),
      makeEntry({
        id: '2',
        beneficiaryId: 'b2',
        beneficiaryName: 'João',
        type: 'INCOME',
        amountCents: 300,
      }),
      makeEntry({
        id: '3',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'EXPENSE',
        amountCents: 100,
      }),
    ];

    const groups = groupEntriesByBeneficiary(entries);
    expect(groups).toHaveLength(2);
    const ana = groups.find((g) => g.beneficiaryId === 'b1');
    expect(ana?.incomeEntries).toHaveLength(1);
    expect(ana?.expenseEntries).toHaveLength(1);
  });

  it('Seção 35 — receita e despesa NUNCA se compensam: totais sempre separados', () => {
    const entries = [
      makeEntry({
        id: '1',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'INCOME',
        amountCents: 1_000,
      }),
      makeEntry({
        id: '2',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'EXPENSE',
        amountCents: 300,
      }),
    ];

    const [ana] = groupEntriesByBeneficiary(entries);
    expect(ana?.incomeTotalCents).toBe(1_000);
    expect(ana?.expenseTotalCents).toBe(300);
    // Nunca existe um campo de "líquido" ou diferença — a garantia é
    // estrutural: não há nenhum lugar no tipo BeneficiaryGroup pra somar
    // os dois, cada total só soma sua própria natureza.
  });

  it('só conta como elegível pra "Gerar transação" o que está ativo e nunca convertido', () => {
    const entries = [
      makeEntry({
        id: '1',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'INCOME',
        amountCents: 500,
      }),
      makeEntry({
        id: '2',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'INCOME',
        amountCents: 200,
        convertedAt: '2026-09-01',
      }),
      makeEntry({
        id: '3',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'INCOME',
        amountCents: 100,
        status: 'CANCELLED',
      }),
    ];

    const [ana] = groupEntriesByBeneficiary(entries);
    expect(ana?.incomeEntries).toHaveLength(3); // todos aparecem na lista
    expect(ana?.incomeEligibleCount).toBe(1); // só o elegível conta
    expect(ana?.incomeTotalCents).toBe(500); // total só soma o elegível
  });

  it('beneficiários vêm ordenados por nome', () => {
    const entries = [
      makeEntry({
        id: '1',
        beneficiaryId: 'b2',
        beneficiaryName: 'Zeca',
        type: 'INCOME',
        amountCents: 100,
      }),
      makeEntry({
        id: '2',
        beneficiaryId: 'b1',
        beneficiaryName: 'Ana',
        type: 'INCOME',
        amountCents: 100,
      }),
    ];

    const groups = groupEntriesByBeneficiary(entries);
    expect(groups.map((g) => g.beneficiaryName)).toEqual(['Ana', 'Zeca']);
  });

  it('lista vazia retorna array vazio', () => {
    expect(groupEntriesByBeneficiary([])).toEqual([]);
  });
});
