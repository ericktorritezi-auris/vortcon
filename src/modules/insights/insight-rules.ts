const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Piso de relevância (Seção 92: "precisão dos insights") — evita ruído de
 * categorias com movimento irrisório (ex.: uma categoria que foi de R$1
 * pra R$3 tecnicamente "cresceu 200%", mas isso não é um insight útil).
 * Sem valor exato definido na especificação — julgamento de engenharia,
 * documentado aqui pra não ser confundido com regra do cliente.
 */
const MIN_RELEVANT_CENTS = 5_000; // R$ 50,00

export interface CategoryPeriodAmounts {
  incomeCents: number;
  expenseCents: number;
}

export interface Insight {
  categoryId: string;
  text: string;
  /** Usado só para ranquear/limitar (Seção 90: "relevância") — nunca exibido. */
  magnitude: number;
}

/**
 * Seção 92: "não gerar infinito" — nunca divide por zero. Retorna null
 * quando não há base de comparação (mês anterior zerado), sinalizando
 * pra quem chama usar um template diferente (total absoluto, não variação).
 */
export function computePercentChange(currentCents: number, previousCents: number): number | null {
  if (previousCents === 0) return null;
  return ((currentCents - previousCents) / previousCents) * 100;
}

/**
 * Motor de regras (Seção 90-92), puro — recebe os totais já calculados
 * pelo Financial Engine (nunca soma nada por conta própria) e devolve 0 ou
 * 1 candidato a insight para esta categoria neste período.
 *
 * Regra de prioridade (Seção 92: "preferir resultado líquido da categoria
 * quando entradas e saídas forem comparadas"): categoria bidirecional
 * (Seção 91 — nunca assume `category.type`, esse campo não existe) com
 * receita E despesa no mesmo período sempre usa o template de resultado
 * líquido, nunca dois insights separados que poderiam se contradizer
 * ("despesa caiu" ao lado de "resultado piorou").
 */
export function buildCategoryInsightCandidate(
  categoryId: string,
  categoryName: string,
  current: CategoryPeriodAmounts,
  previous: CategoryPeriodAmounts,
): Insight | null {
  const hasIncome = current.incomeCents > 0;
  const hasExpense = current.expenseCents > 0;

  if (!hasIncome && !hasExpense) return null;

  if (hasIncome && hasExpense) {
    const netCents = current.incomeCents - current.expenseCents;
    return {
      categoryId,
      text: `A categoria ${categoryName} registrou ${currencyFormatter.format(current.incomeCents / 100)} em entradas e ${currencyFormatter.format(current.expenseCents / 100)} em saídas, com resultado líquido de ${currencyFormatter.format(netCents / 100)} no período.`,
      magnitude: current.incomeCents + current.expenseCents,
    };
  }

  const side: 'expense' | 'income' = hasExpense ? 'expense' : 'income';
  const currentCents = side === 'expense' ? current.expenseCents : current.incomeCents;
  const previousCents = side === 'expense' ? previous.expenseCents : previous.incomeCents;
  const label = side === 'expense' ? 'despesas' : 'receitas';

  const smallerBase = Math.min(currentCents, previousCents);
  const change = computePercentChange(currentCents, previousCents);

  if (change !== null && smallerBase >= MIN_RELEVANT_CENTS) {
    // Seção 92: nunca confundir redução de despesa com lucro — o template
    // descreve só a métrica em si (a despesa em si mudou), nunca conclui
    // nada sobre o resultado financeiro geral do tenant.
    const direction = change < 0 ? 'caíram' : 'subiram';
    return {
      categoryId,
      text: `As ${label} da categoria ${categoryName} ${direction} ${Math.abs(Math.round(change))}% em relação ao mês anterior.`,
      magnitude: currentCents,
    };
  }

  return {
    categoryId,
    text: `As ${label} da categoria ${categoryName} totalizaram ${currencyFormatter.format(currentCents / 100)} neste mês.`,
    magnitude: currentCents,
  };
}

/** Seção 90: "relevância" — ordena pelos de maior movimento e corta no limite. */
export function selectTopInsights(candidates: Insight[], limit: number): Insight[] {
  return [...candidates].sort((a, b) => b.magnitude - a.magnitude).slice(0, limit);
}
