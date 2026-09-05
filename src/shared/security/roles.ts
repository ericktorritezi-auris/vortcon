import type { Role } from '@prisma/client';

/**
 * Capacidades por papel (Seção 22-23). Fonte única de verdade — nenhum outro
 * lugar do código deve checar `role === 'GLOBAL_ADMIN'` para decidir acesso
 * a dados financeiros; sempre passar por `canAccessFinancialData(role)`.
 *
 * Regra explícita e não-negociável da Seção 23:
 *   GLOBAL_ADMIN.canAccessFinancialData = false
 */
const ROLE_CAPABILITIES = {
  GLOBAL_ADMIN: {
    canAccessFinancialData: false,
    canManageTenants: true,
  },
  TENANT_OWNER: {
    canAccessFinancialData: true,
    canManageTenants: false,
  },
} as const satisfies Record<Role, { canAccessFinancialData: boolean; canManageTenants: boolean }>;

export function canAccessFinancialData(role: Role): boolean {
  return ROLE_CAPABILITIES[role].canAccessFinancialData;
}

export function canManageTenants(role: Role): boolean {
  return ROLE_CAPABILITIES[role].canManageTenants;
}
