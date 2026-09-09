import { prisma } from '@/shared/database/client';

export interface SearchResult {
  type: 'transacao' | 'conta' | 'categoria' | 'tag';
  label: string;
  detail: string;
  href: string;
}

const RESULTS_PER_TYPE = 5;

/**
 * Busca real do painel do tenant (nunca existia — a Topbar sempre teve um
 * campo desabilitado de propósito, desde a reestruturação de UX entre os
 * Estágios 8-9, porque na época os módulos que ela cruzaria ainda não
 * existiam). tenantId sempre da sessão (Seção 142) — nunca aceito como
 * parâmetro vindo do cliente. Escopo: transações (por descrição), contas,
 * categorias e tags — os quatro tipos de dado que o tenant mais precisa
 * localizar rápido.
 */
export async function searchTenantData(tenantId: string, query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [transactions, accounts, categories, tags] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { tenantId, description: { contains: trimmed, mode: 'insensitive' } },
      take: RESULTS_PER_TYPE,
      orderBy: { dueDate: 'desc' },
    }),
    prisma.financialAccount.findMany({
      where: { tenantId, name: { contains: trimmed, mode: 'insensitive' } },
      take: RESULTS_PER_TYPE,
    }),
    prisma.category.findMany({
      where: { tenantId, name: { contains: trimmed, mode: 'insensitive' } },
      take: RESULTS_PER_TYPE,
    }),
    prisma.tag.findMany({
      where: { tenantId, name: { contains: trimmed, mode: 'insensitive' } },
      take: RESULTS_PER_TYPE,
    }),
  ]);

  const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

  const results: SearchResult[] = [];

  for (const transaction of transactions) {
    results.push({
      type: 'transacao',
      label: transaction.description,
      detail: `${currencyFormatter.format(transaction.amountCents / 100)} · ${dateFormatter.format(transaction.dueDate)}`,
      href: '/app/transacoes',
    });
  }
  for (const account of accounts) {
    results.push({ type: 'conta', label: account.name, detail: 'Conta', href: '/app/contas' });
  }
  for (const category of categories) {
    results.push({
      type: 'categoria',
      label: category.name,
      detail: 'Categoria',
      href: '/app/categorias',
    });
  }
  for (const tag of tags) {
    results.push({ type: 'tag', label: tag.name, detail: 'Tag', href: '/app/tags' });
  }

  return results;
}
