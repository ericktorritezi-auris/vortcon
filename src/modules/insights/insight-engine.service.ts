import { prisma } from '@/shared/database/client';
import type { CategoryBreakdownRow } from '@/modules/financial-engine/financial-engine.service';
import { buildCategoryInsightCandidate, selectTopInsights } from './insight-rules';
import type { Insight } from './insight-rules';

const MAX_INSIGHTS = 5;

/**
 * Insight Engine (Seção 90) — orquestra a busca de nomes de categoria
 * (a única parte que ainda falta) e delega as regras/templates pra
 * `insight-rules.ts`, que é pura e testável isoladamente. Recebe o
 * breakdown por categoria já calculado (mesmo dado que o Cockpit usa para
 * os destaques) — nunca busca de novo o que quem chama já tem, evitando
 * uma consulta duplicada ao banco.
 */
export async function generateCategoryInsights(
  tenantId: string,
  currentBreakdown: CategoryBreakdownRow[],
  previousBreakdown: CategoryBreakdownRow[],
): Promise<Insight[]> {
  const categories = await prisma.category.findMany({ where: { tenantId } });

  const categoryNameById = new Map<string, string>(
    categories.map((category: { id: string; name: string }): [string, string] => [
      category.id,
      category.name,
    ]),
  );
  const previousById = new Map(previousBreakdown.map((row) => [row.categoryId, row]));

  const candidates: Insight[] = [];
  for (const row of currentBreakdown) {
    const categoryName = categoryNameById.get(row.categoryId);
    // Categoria pode ter sido inativada/removida do mapa desde então —
    // nunca gera insight referenciando uma categoria que não existe mais.
    if (!categoryName) continue;

    const previous = previousById.get(row.categoryId);
    const candidate = buildCategoryInsightCandidate(
      row.categoryId,
      categoryName,
      { incomeCents: row.incomeTotalCents, expenseCents: row.expenseTotalCents },
      {
        incomeCents: previous?.incomeTotalCents ?? 0,
        expenseCents: previous?.expenseTotalCents ?? 0,
      },
    );
    if (candidate) candidates.push(candidate);
  }

  return selectTopInsights(candidates, MAX_INSIGHTS);
}
