export interface EntryView {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  entryDate: string | Date;
  status: 'ACTIVE' | 'CANCELLED';
  beneficiaryId: string;
  beneficiaryName: string;
  originName: string | null;
  convertedAt: string | Date | null;
  seriesPosition: { current: number; total: number | null } | null;
}

export interface BeneficiaryGroup {
  beneficiaryId: string;
  beneficiaryName: string;
  incomeEntries: EntryView[];
  incomeTotalCents: number;
  incomeEligibleCount: number;
  expenseEntries: EntryView[];
  expenseTotalCents: number;
  expenseEligibleCount: number;
}

/**
 * Agrupamento por Beneficiário (Seção 34) — NUNCA por data, ao contrário
 * de Transações. Dentro de cada beneficiário, Receitas e Despesas ficam
 * SEMPRE separadas (Seção 35: "receita e despesa nunca se compensam") —
 * cada uma com seu próprio total e sua própria contagem de elegíveis pra
 * "Gerar transação" (ativo + nunca convertido).
 */
export function groupEntriesByBeneficiary(entries: EntryView[]): BeneficiaryGroup[] {
  const groups = new Map<string, BeneficiaryGroup>();

  for (const entry of entries) {
    let group = groups.get(entry.beneficiaryId);
    if (!group) {
      group = {
        beneficiaryId: entry.beneficiaryId,
        beneficiaryName: entry.beneficiaryName,
        incomeEntries: [],
        incomeTotalCents: 0,
        incomeEligibleCount: 0,
        expenseEntries: [],
        expenseTotalCents: 0,
        expenseEligibleCount: 0,
      };
      groups.set(entry.beneficiaryId, group);
    }

    const isEligible = entry.status === 'ACTIVE' && !entry.convertedAt;

    if (entry.type === 'INCOME') {
      group.incomeEntries.push(entry);
      if (isEligible) {
        group.incomeTotalCents += entry.amountCents;
        group.incomeEligibleCount += 1;
      }
    } else {
      group.expenseEntries.push(entry);
      if (isEligible) {
        group.expenseTotalCents += entry.amountCents;
        group.expenseEligibleCount += 1;
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.beneficiaryName.localeCompare(b.beneficiaryName, 'pt-BR'),
  );
}
