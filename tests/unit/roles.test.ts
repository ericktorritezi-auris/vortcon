import { describe, expect, it } from 'vitest';
import { canAccessFinancialData, canManageTenants } from '@/shared/security/roles';

describe('capacidades por papel (Seção 23)', () => {
  it('GLOBAL_ADMIN nunca acessa dados financeiros', () => {
    expect(canAccessFinancialData('GLOBAL_ADMIN')).toBe(false);
  });

  it('TENANT_OWNER acessa dados financeiros do próprio tenant', () => {
    expect(canAccessFinancialData('TENANT_OWNER')).toBe(true);
  });

  it('apenas GLOBAL_ADMIN gerencia tenants', () => {
    expect(canManageTenants('GLOBAL_ADMIN')).toBe(true);
    expect(canManageTenants('TENANT_OWNER')).toBe(false);
  });
});
