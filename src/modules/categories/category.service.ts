import { prisma } from '@/shared/database/client';
import { getCategoryFlow } from '@/modules/financial-engine/financial-engine.service';

/**
 * Categorias globais e transversais ao tenant (Seção 41-50). O formulário
 * de receita e o de despesa consultam este MESMO cadastro (Seção 43) — não
 * existe filtro por natureza aqui, de propósito. Ver Seção 225 para a
 * regra completa; `type`/`nature` são proibidos neste modelo.
 */

/**
 * `includeInactive` (pedido do cliente) — default `false` pelo mesmo
 * motivo de `listAccounts`: todo seletor de categoria em
 * transação/relatório precisa continuar mostrando só as ativas; só a tela
 * de gerenciamento passa `true`.
 */
export async function listCategories(tenantId: string, includeInactive = false) {
  return prisma.category.findMany({
    where: { tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export async function findCategoryById(tenantId: string, categoryId: string) {
  return prisma.category.findFirst({ where: { id: categoryId, tenantId } });
}

export async function createCategory(tenantId: string, name: string, iconKey?: string) {
  return prisma.category.create({ data: { tenantId, name, iconKey: iconKey ?? 'wallet' } });
}

interface UpdateCategoryInput {
  name?: string;
  iconKey?: string;
}

/** Editar nome/ícone (pedido do cliente). */
export async function updateCategory(
  tenantId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  return prisma.category.updateMany({
    where: { id: categoryId, tenantId },
    data: { name: input.name, iconKey: input.iconKey },
  });
}

/** Categoria com histórico prefere inativação (Seção 50) — nunca apaga transações antigas que a referenciam. */
export async function deactivateCategory(tenantId: string, categoryId: string) {
  return prisma.category.updateMany({
    where: { id: categoryId, tenantId },
    data: { active: false },
  });
}

export async function reactivateCategory(tenantId: string, categoryId: string) {
  return prisma.category.updateMany({
    where: { id: categoryId, tenantId },
    data: { active: true },
  });
}

/**
 * Excluir de verdade (pedido do cliente) — só permitido quando nenhuma
 * transação nem série recorrente referencia a categoria. Havendo
 * qualquer vínculo, lança erro orientando a inativar em vez disso.
 */
export async function deleteCategory(tenantId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) throw new Error('Categoria não encontrada neste tenant.');

  const [transactionCount, recurrenceCount] = await Promise.all([
    prisma.financialTransaction.count({ where: { categoryId } }),
    prisma.recurrenceSeries.count({ where: { defaultCategoryId: categoryId } }),
  ]);

  if (transactionCount > 0 || recurrenceCount > 0) {
    throw new Error(
      'Esta categoria já tem lançamento ou recorrência vinculada — inative em vez de excluir.',
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
}

interface Period {
  from: Date;
  to: Date;
}

/**
 * Relatório completo de UMA categoria (Seção 44-47, 96) — sempre os dois
 * lados + resultado líquido, nunca esconde despesas só porque a categoria
 * também aparece em receitas (Seção 47).
 */
export async function getCategoryReport(tenantId: string, categoryId: string, period: Period) {
  const category = await findCategoryById(tenantId, categoryId);
  if (!category) {
    throw new Error(`Categoria ${categoryId} não encontrada neste tenant.`);
  }

  const flow = await getCategoryFlow(tenantId, categoryId, period);

  return { category, ...flow };
}
