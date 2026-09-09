import { prisma } from '@/shared/database/client';

export interface AdminSearchResult {
  tenantId: string;
  ownerName: string;
  ownerEmail: string;
  href: string;
}

const RESULTS_LIMIT = 8;

/**
 * Busca real do painel Admin (nunca existia — mesmo motivo do
 * `tenant-search.service.ts`: shell visual desabilitado desde a
 * reestruturação de UX, Estágios 8-9). Escopo deliberadamente restrito a
 * tenants (nome/e-mail/usuário do dono) — nunca dado financeiro, mesma
 * regra de sempre (Admin não acessa financeiro do tenant).
 */
export async function searchTenants(query: string): Promise<AdminSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const memberships = await prisma.tenantUser.findMany({
    where: {
      user: {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { email: { contains: trimmed, mode: 'insensitive' } },
          { username: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
    },
    include: { user: true },
    take: RESULTS_LIMIT,
  });

  return memberships.map((membership: (typeof memberships)[number]) => ({
    tenantId: membership.tenantId,
    ownerName: membership.user.name,
    ownerEmail: membership.user.email,
    href: `/admin/tenants/${membership.tenantId}`,
  }));
}
