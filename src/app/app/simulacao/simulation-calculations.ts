import type { FinancialTransactionStatus, FinancialTransactionType } from '@prisma/client';

export interface SimulationTransaction {
  id: string;
  type: FinancialTransactionType;
  status: FinancialTransactionStatus;
  amountCents: number;
  categoryId: string | null;
  accountId: string;
}

export interface SimulationFilters {
  type: FinancialTransactionType | 'ALL';
  categoryId: string | 'ALL';
  accountId: string | 'ALL';
  status: FinancialTransactionStatus | 'ALL';
}

export const DEFAULT_SIMULATION_FILTERS: SimulationFilters = {
  type: 'ALL',
  categoryId: 'ALL',
  accountId: 'ALL',
  status: 'ALL',
};

/**
 * Simulação (evolução v1.8, pedido do cliente): filtro por Tipo, Categoria,
 * Conta e Status — os quatro sempre abrindo em "Todos" (Seção pedida:
 * "geralmente o filtro já vem preenchido com conta todas, categoria
 * todas..."). Puramente client-side — a lista inteira do mês já veio do
 * servidor, filtrar de novo no banco a cada troca de filtro derrubaria a
 * seleção acumulada do usuário (ver `computeSimulationSummary`).
 */
export function filterSimulationTransactions(
  transactions: SimulationTransaction[],
  filters: SimulationFilters,
): SimulationTransaction[] {
  return transactions.filter((transaction) => {
    if (filters.type !== 'ALL' && transaction.type !== filters.type) return false;
    if (filters.categoryId !== 'ALL' && transaction.categoryId !== filters.categoryId) return false;
    if (filters.accountId !== 'ALL' && transaction.accountId !== filters.accountId) return false;
    if (filters.status !== 'ALL' && transaction.status !== filters.status) return false;
    return true;
  });
}

export interface SimulationSelectionItem {
  id: string;
  signedCents: number;
  /** Acumulado líquido na ORDEM em que o usuário foi selecionando — não é o total final, é o "100, +100, 200..." que o cliente pediu para ver crescer linha a linha. */
  runningNetCents: number;
}

export interface SimulationSummary {
  incomeSumCents: number;
  expenseSumCents: number;
  netCents: number;
  items: SimulationSelectionItem[];
}

/**
 * Soma da seleção do usuário (Seção pedida pelo cliente — "se eu for pagar
 * tudo de uma vez, o quanto que vai ser meu investimento?"). `selectedIds`
 * é um array na ORDEM de seleção, não um Set — a ordem é o que dá o efeito
 * "acumulado crescendo" pedido. Puramente de leitura/cálculo: nunca grava
 * nada, nunca chama o Financial Engine nem nenhum outro cálculo do sistema
 * — é uma simulação isolada, à parte (Seção pedida: "eu não posso ter
 * impacto porque o sistema está funcionando").
 */
export function computeSimulationSummary(
  transactions: SimulationTransaction[],
  selectedIds: string[],
): SimulationSummary {
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  let running = 0;
  let incomeSumCents = 0;
  let expenseSumCents = 0;
  const items: SimulationSelectionItem[] = [];

  for (const id of selectedIds) {
    const transaction = byId.get(id);
    // Selecionado antes de a transação ter sido removida da lista (ex.:
    // excluída em outra aba) — ignora, nunca quebra a soma dos demais.
    if (!transaction) continue;

    const signedCents =
      transaction.type === 'INCOME' ? transaction.amountCents : -transaction.amountCents;
    running += signedCents;
    if (transaction.type === 'INCOME') {
      incomeSumCents += transaction.amountCents;
    } else {
      expenseSumCents += transaction.amountCents;
    }
    items.push({ id, signedCents, runningNetCents: running });
  }

  return {
    incomeSumCents,
    expenseSumCents,
    netCents: incomeSumCents - expenseSumCents,
    items,
  };
}
