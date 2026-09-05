import { prisma } from '@/shared/database/client';
import { getTagFlow } from '@/modules/financial-engine/financial-engine.service';

export async function listTags(tenantId: string) {
  return prisma.tag.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } });
}

export async function findTagById(tenantId: string, tagId: string) {
  return prisma.tag.findFirst({ where: { id: tagId, tenantId } });
}

export async function createTag(tenantId: string, name: string) {
  return prisma.tag.create({ data: { tenantId, name } });
}

export async function deactivateTag(tenantId: string, tagId: string) {
  return prisma.tag.updateMany({ where: { id: tagId, tenantId }, data: { active: false } });
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
