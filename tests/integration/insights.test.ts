import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory } from '@/modules/categories/category.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import { getCockpitSummary } from '@/modules/cockpit/cockpit.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Insight Engine (Seção 90-92), validado contra PostgreSQL real em CI —
 * reproduz o exemplo exato da Seção 91 (categoria Empréstimo: R$ 20.000
 * em receitas, R$ 5.400 em despesas... aqui em valores adaptados) e
 * confirma a integração ponta a ponta com o Cockpit (Estágio 11 original
 * previa isso junto, nunca foi construído até agora).
 */
describe('Insight Engine — integração via Cockpit', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Insights Test Owner',
      email: `insights-${suffix}@example.com`,
      username: `insights_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Insights',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;
  });

  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('categoria bidirecional gera insight de resultado líquido (Seção 91-92), reproduzindo o exemplo da especificação', async () => {
    const category = await createCategory(tenantId, 'Empréstimo');

    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Recebimento',
      amountCents: 800_000,
      dueDate: new Date('2026-09-10'),
      accountId,
      categoryId: category.id,
    });
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Parcela',
      amountCents: 500_000,
      dueDate: new Date('2026-09-15'),
      accountId,
      categoryId: category.id,
    });

    const summary = await getCockpitSummary(tenantId, new Date('2026-09-01T00:00:00.000Z'));

    const insight = summary.insights.find((i) => i.categoryId === category.id);
    expect(insight).toBeDefined();
    expect(insight?.text).toContain('Empréstimo');
    expect(insight?.text).toContain('entradas');
    expect(insight?.text).toContain('saídas');
    expect(insight?.text).toContain('resultado líquido');
    // Nunca deve mencionar lucro ou prejuízo diretamente — só a métrica.
    expect(insight?.text.toLowerCase()).not.toContain('lucro');
  });

  it('categoria só de despesa com queda relevante em relação ao mês anterior', async () => {
    const category = await createCategory(tenantId, 'Transporte');

    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Mês anterior',
      amountCents: 100_000,
      dueDate: new Date('2026-08-10'),
      accountId,
      categoryId: category.id,
    });
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Mês atual',
      amountCents: 88_000,
      dueDate: new Date('2026-09-10'),
      accountId,
      categoryId: category.id,
    });

    const summary = await getCockpitSummary(tenantId, new Date('2026-09-01T00:00:00.000Z'));

    const insight = summary.insights.find((i) => i.categoryId === category.id);
    expect(insight?.text).toBe(
      'As despesas da categoria Transporte caíram 12% em relação ao mês anterior.',
    );
  });

  it('mês sem nenhuma movimentação não gera insights (nunca inventa dado)', async () => {
    const summary = await getCockpitSummary(tenantId, new Date('2026-12-01T00:00:00.000Z'));
    expect(summary.insights).toEqual([]);
  });
});
