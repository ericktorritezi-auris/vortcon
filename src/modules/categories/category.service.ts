import { prisma } from '@/shared/database/client';
import { getCategoryFlow } from '@/modules/financial-engine/financial-engine.service';

/**
 * Categorias globais e transversais ao tenant (Seção 41-50). O formulário
 * de receita e o de despesa consultam este MESMO cadastro (Seção 43) — não
 * existe filtro por natureza aqui, de propósito. Ver Seção 225 para a
 * regra completa; `type`/`nature` são proibidos neste modelo.
 */

export async function listCategories(tenantId: string) {
  return prisma.category.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } });
}

export async function findCategoryById(tenantId: string, categoryId: string) {
  return prisma.category.findFirst({ where: { id: categoryId, tenantId } });
}

export async function createCategory(tenantId: string, name: string, iconKey?: string) {
  return prisma.category.create({ data: { tenantId, name, iconKey: iconKey ?? 'wallet' } });
}

/** Categoria com histórico prefere inativação (Seção 50) — nunca apaga transações antigas que a referenciam. */
export async function deactivateCategory(tenantId: string, categoryId: string) {
  return prisma.category.updateMany({
    where: { id: categoryId, tenantId },
    data: { active: false },
  });
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
