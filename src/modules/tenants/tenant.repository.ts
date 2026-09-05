import { prisma } from '@/shared/database/client';
import type { TenantAccessBlock, TenantBlockType } from '@prisma/client';

/**
 * Camada de acesso a dados de `tenants`/`tenant_access_blocks` (Seção 20-21,
 * 30-31). Regra absoluta: nenhuma função aqui aceita um `tenantId` "confiado
 * cegamente" vindo do frontend sem que ele já tenha sido resolvido pela
 * identidade autenticada em uma camada superior (AccessPolicyService,
 * Estágio 4). Este repositório é a fronteira final — não a primeira.
 */

export async function findTenantById(tenantId: string) {
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

/** Tenant nunca é hard deleted (Seção 31) — encerramento é uma transição de lifecycle. */
export async function deactivateTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { lifecycle: 'INACTIVE' },
  });
}

export async function reactivateTenant(tenantId: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { lifecycle: 'ACTIVE' },
  });
}

/** Bloqueios ativos do tenant, agrupados por tipo (Seção 30: dimensões separadas). */
export async function findActiveBlocks(tenantId: string): Promise<TenantAccessBlock[]> {
  return prisma.tenantAccessBlock.findMany({
    where: { tenantId, active: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBlock(tenantId: string, type: TenantBlockType, reason?: string) {
  return prisma.tenantAccessBlock.create({
    data: { tenantId, type, reason },
  });
}

/** Levantar bloqueio preserva o registro (Seção 30) — nunca deleta a linha. */
export async function liftBlock(blockId: string) {
  return prisma.tenantAccessBlock.update({
    where: { id: blockId },
    data: { active: false, liftedAt: new Date() },
  });
}

/**
 * Resolve o tenant de um usuário autenticado (base do AccessPolicyService no
 * Estágio 4). `userId` aqui vem da sessão, nunca do corpo da requisição.
 */
export async function findTenantByUserId(userId: string) {
  const membership = await prisma.tenantUser.findUnique({
    where: { userId },
    include: { tenant: true },
  });
  return membership?.tenant ?? null;
}
