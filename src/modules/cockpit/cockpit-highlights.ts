export interface CategoryMovement {
  categoryId: string;
  incomeTotalCents: number;
  expenseTotalCents: number;
  netResultCents: number;
}

export interface CategoryHighlights {
  biggestExpenseCategoryId: string | null;
  biggestIncomeCategoryId: string | null;
  biggestPositiveNetCategoryId: string | null;
  biggestNegativeNetCategoryId: string | null;
  expenseGrowthCategoryIds: string[];
  incomeGrowthCategoryIds: string[];
}

/**
 * Destaques de categoria no Cockpit (Seção 87). Pura, sem I/O — recebe a
 * movimentação já calculada do mês atual e do mês anterior (pelo Financial
 * Engine) e só escolhe destaques, nunca soma nada por conta própria.
 *
 * "Não presumir que categoria pertence somente a um lado" (Seção 87): uma
 * mesma categoria pode aparecer como maior saída E ter crescido em receita
 * ao mesmo tempo — nada aqui filtra por natureza fixa da categoria.
 */
export function selectCategoryHighlights(
  current: CategoryMovement[],
  previous: CategoryMovement[],
): CategoryHighlights {
  const previousById = new Map(previous.map((row) => [row.categoryId, row]));

  let biggestExpense: CategoryMovement | null = null;
  let biggestIncome: CategoryMovement | null = null;
  let biggestPositiveNet: CategoryMovement | null = null;
  let biggestNegativeNet: CategoryMovement | null = null;
  const expenseGrowthCategoryIds: string[] = [];
  const incomeGrowthCategoryIds: string[] = [];

  for (const row of current) {
    if (
      row.expenseTotalCents > 0 &&
      (!biggestExpense || row.expenseTotalCents > biggestExpense.expenseTotalCents)
    ) {
      biggestExpense = row;
    }
    if (
      row.incomeTotalCents > 0 &&
      (!biggestIncome || row.incomeTotalCents > biggestIncome.incomeTotalCents)
    ) {
      biggestIncome = row;
    }
    if (
      row.netResultCents > 0 &&
      (!biggestPositiveNet || row.netResultCents > biggestPositiveNet.netResultCents)
    ) {
      biggestPositiveNet = row;
    }
    if (
      row.netResultCents < 0 &&
      (!biggestNegativeNet || row.netResultCents < biggestNegativeNet.netResultCents)
    ) {
      biggestNegativeNet = row;
    }

    const previousRow = previousById.get(row.categoryId);
    const previousExpense = previousRow?.expenseTotalCents ?? 0;
    const previousIncome = previousRow?.incomeTotalCents ?? 0;

    if (row.expenseTotalCents > previousExpense) {
      expenseGrowthCategoryIds.push(row.categoryId);
    }
    if (row.incomeTotalCents > previousIncome) {
      incomeGrowthCategoryIds.push(row.categoryId);
    }
  }

  return {
    biggestExpenseCategoryId: biggestExpense?.categoryId ?? null,
    biggestIncomeCategoryId: biggestIncome?.categoryId ?? null,
    biggestPositiveNetCategoryId: biggestPositiveNet?.categoryId ?? null,
    biggestNegativeNetCategoryId: biggestNegativeNet?.categoryId ?? null,
    expenseGrowthCategoryIds,
    incomeGrowthCategoryIds,
  };
}
