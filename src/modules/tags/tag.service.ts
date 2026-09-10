import { prisma } from '@/shared/database/client';
import { getTagFlow } from '@/modules/financial-engine/financial-engine.service';

/**
 * `includeInactive` (mesmo padrão de contas/categorias) — default `false`
 * porque o seletor de tags ao criar transação precisa continuar mostrando
 * só as ativas; só a tela de gerenciamento passa `true`.
 */
export async function listTags(tenantId: string, includeInactive = false) {
  return prisma.tag.findMany({
    where: { tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export async function findTagById(tenantId: string, tagId: string) {
  return prisma.tag.findFirst({ where: { id: tagId, tenantId } });
}

export async function createTag(tenantId: string, name: string) {
  return prisma.tag.create({ data: { tenantId, name } });
}

/** Editar nome (pedido do cliente). */
export async function updateTag(tenantId: string, tagId: string, name: string) {
  return prisma.tag.updateMany({ where: { id: tagId, tenantId }, data: { name } });
}

export async function deactivateTag(tenantId: string, tagId: string) {
  return prisma.tag.updateMany({ where: { id: tagId, tenantId }, data: { active: false } });
}

export async function reactivateTag(tenantId: string, tagId: string) {
  return prisma.tag.updateMany({ where: { id: tagId, tenantId }, data: { active: true } });
}

/**
 * Excluir de verdade (pedido do cliente: "se a tag não tiver vinculada a
 * nenhum lançamento, ela pode sumir do banco também, não precisa ficar
 * lá") — só permitido quando nada referencia a tag: nenhuma transação e
 * nenhuma série recorrente.
 */
export async function deleteTag(tenantId: string, tagId: string): Promise<void> {
  const tag = await prisma.tag.findFirst({ where: { id: tagId, tenantId } });
  if (!tag) throw new Error('Tag não encontrada neste tenant.');

  const [transactionTagCount, recurrenceTagCount] = await Promise.all([
    prisma.financialTransactionTag.count({ where: { tagId } }),
    prisma.recurrenceSeriesTag.count({ where: { tagId } }),
  ]);

  if (transactionTagCount > 0 || recurrenceTagCount > 0) {
    throw new Error(
      'Esta tag já está vinculada a algum lançamento ou recorrência — inative em vez de excluir.',
    );
  }

  await prisma.tag.delete({ where: { id: tagId } });
}

interface Period {
  from: Date;
  to: Date;
}

export async function getTagReport(tenantId: string, tagId: string, period: Period) {
  const tag = await findTagById(tenantId, tagId);
  if (!tag) {
    throw new Error(`Tag ${tagId} não encontrada neste tenant.`);
  }

  const flow = await getTagFlow(tenantId, tagId, period);

  return { tag, ...flow };
}
