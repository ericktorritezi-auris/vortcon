import type { Prisma } from '@prisma/client';

/**
 * Exclusões financeiras (Seção 59): cancelado e ignorado nunca contam em
 * saldo, receitas, despesas, resultado, pendências, projeção, categorias,
 * tags, Dashboard, Cockpit, relatórios, gráficos ou insights. Centralizado
 * aqui — todo o Financial Engine parte deste filtro, nunca reimplementa a
 * exclusão individualmente (Seção 59: "Centralizar regra").
 */
export function activeTransactionWhere(
  tenantId: string,
  extra: Prisma.FinancialTransactionWhereInput = {},
): Prisma.FinancialTransactionWhereInput {
  return {
    tenantId,
    ignored: false,
    cancelledAt: null,
    ...extra,
  };
}
