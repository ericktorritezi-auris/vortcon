import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import { searchTenantData } from '@/modules/search/tenant-search.service';
import { searchTenants } from '@/modules/search/admin-search.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Busca (Estágio 18) — nunca existia antes (shell visual desabilitado
 * desde a reestruturação de UX, Estágios 8-9). O ponto mais crítico:
 * isolamento entre tenants (a busca nunca pode vazar dado de A pra B) e a
 * busca do Admin nunca expor dado financeiro.
 */
describe('Busca — tenant e Admin', () => {
  let tenantAId: string;
  let tenantBId: string;
  let planId: string;
  let suffix: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    suffix = crypto.randomUUID().slice(0, 8);
    const { tenant: tenantA } = await provisionTenantWithOwner({
      name: 'Busca Owner A',
      email: `busca-a-${suffix}@example.com`,
      username: `busca_a_${suffix}`,
      planId,
    });
    tenantAId = tenantA.id;

    const { tenant: tenantB } = await provisionTenantWithOwner({
      name: 'Busca Owner B',
      email: `busca-b-${suffix}@example.com`,
      username: `busca_b_${suffix}`,
      planId,
    });
    tenantBId = tenantB.id;

    const accountA = await createAccount(tenantAId, {
      name: 'Conta Secreta do Tenant A',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });

    await createIncomeOrExpense(tenantAId, {
      type: 'EXPENSE',
      description: 'Assinatura Netflix Premium',
      amountCents: 5590,
      dueDate: new Date('2026-09-10'),
      accountId: accountA.id,
    });
  });

  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await prisma.financialAccount.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    await cleanupTenant(tenantAId);
    await cleanupTenant(tenantBId);
    await deleteTestPlan(planId);
  });

  it('busca do tenant A encontra a própria transação e conta', async () => {
    const transactionResults = await searchTenantData(tenantAId, 'Netflix');
    expect(
      transactionResults.some((r) => r.type === 'transacao' && r.label.includes('Netflix')),
    ).toBe(true);

    const accountResults = await searchTenantData(tenantAId, 'Secreta');
    expect(accountResults.some((r) => r.type === 'conta')).toBe(true);
  });

  it('busca do tenant B NUNCA encontra dado do tenant A (isolamento)', async () => {
    const resultsForNetflix = await searchTenantData(tenantBId, 'Netflix');
    expect(resultsForNetflix).toHaveLength(0);

    const resultsForSecreta = await searchTenantData(tenantBId, 'Secreta');
    expect(resultsForSecreta).toHaveLength(0);
  });

  it('busca com menos de 2 caracteres nunca retorna nada (evita busca ampla demais)', async () => {
    const results = await searchTenantData(tenantAId, 'a');
    expect(results).toHaveLength(0);
  });

  it('busca do Admin encontra o tenant pelo nome, e-mail ou usuário do dono', async () => {
    const byName = await searchTenants('Busca Owner A');
    expect(byName.some((r) => r.tenantId === tenantAId)).toBe(true);

    const byEmail = await searchTenants(`busca-a-${suffix}`);
    expect(byEmail.some((r) => r.tenantId === tenantAId)).toBe(true);
  });

  it('busca do Admin nunca expõe dado financeiro — só nome/e-mail/link do tenant', async () => {
    const results = await searchTenants('Busca Owner A');
    const match = results.find((r) => r.tenantId === tenantAId);
    expect(match).toBeDefined();

    const serialized = JSON.stringify(match);
    expect(serialized).not.toContain('Netflix');
    expect(serialized).not.toContain('5590');
    expect(serialized.toLowerCase()).not.toContain('amountcents');
  });
});
