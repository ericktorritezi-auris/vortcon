import { prisma } from '@/shared/database/client';

/**
 * Origem (Seções 3-6) — cadastro auxiliar do universo de Programações,
 * mesmo padrão de Categoria, mas sem iconografia (pedido explícito do
 * cliente). `includeInactive` default `false` pelo mesmo motivo de
 * `listCategories`/`listAccounts`: o seletor de lançamento novo precisa
 * continuar mostrando só as ativas; só a tela de gerenciamento passa `true`.
 */
export async function listOrigins(tenantId: string, includeInactive = false) {
  return prisma.programmingOrigin.findMany({
    where: { tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export async function createOrigin(tenantId: string, name: string) {
  return prisma.programmingOrigin.create({ data: { tenantId, name } });
}

export async function updateOrigin(tenantId: string, originId: string, name: string) {
  return prisma.programmingOrigin.updateMany({ where: { id: originId, tenantId }, data: { name } });
}

export async function deactivateOrigin(tenantId: string, originId: string) {
  return prisma.programmingOrigin.updateMany({
    where: { id: originId, tenantId },
    data: { active: false },
  });
}

export async function reactivateOrigin(tenantId: string, originId: string) {
  return prisma.programmingOrigin.updateMany({
    where: { id: originId, tenantId },
    data: { active: true },
  });
}

/**
 * Excluir de verdade (Seção 6) — só permitido quando nenhum lançamento
 * de Programação referencia a origem. Havendo qualquer vínculo, lança
 * erro orientando a inativar em vez disso — a mesma constraint RESTRICT
 * já existe no banco como rede de segurança, esta checagem é só pra dar
 * uma mensagem clara em vez de um erro de FK.
 */
export async function deleteOrigin(tenantId: string, originId: string): Promise<void> {
  const origin = await prisma.programmingOrigin.findFirst({ where: { id: originId, tenantId } });
  if (!origin) throw new Error('Origem não encontrada neste tenant.');

  const entryCount = await prisma.programmingEntry.count({ where: { originId } });
  if (entryCount > 0) {
    throw new Error('Esta origem já tem lançamento vinculado — inative em vez de excluir.');
  }

  await prisma.programmingOrigin.delete({ where: { id: originId } });
}
