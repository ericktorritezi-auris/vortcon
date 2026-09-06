import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory } from '@/modules/categories/category.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import {
  confirmChecklist,
  dismissTour,
  getOnboardingStatus,
} from '@/modules/onboarding/onboarding.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Onboarding (Seção 84-85), validado contra PostgreSQL real em CI. Os 4
 * passos são sempre derivados dos dados reais — nunca uma segunda fonte de
 * verdade — e a confirmação só é aceita quando os 4 já estão de fato completos.
 */
describe('fluxo de onboarding', () => {
  let tenantId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Onboarding Flow Owner',
      email: `onboarding-${suffix}@example.com`,
      username: `onboarding_${suffix}`,
      planId,
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await prisma.onboardingProgress.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('tenant novo começa com os 4 passos pendentes e nada dispensado', async () => {
    const status = await getOnboardingStatus(tenantId);
    expect(status.completedCount).toBe(0);
    expect(status.isComplete).toBe(false);
    expect(status.tourDismissed).toBe(false);
    expect(status.checklistConfirmed).toBe(false);
  });

  it('confirmar checklist antes de completar os 4 passos é rejeitado', async () => {
    await expect(confirmChecklist(tenantId)).rejects.toThrow();
  });

  it('dispensar o tour persiste e nunca mais volta a aparecer', async () => {
    await dismissTour(tenantId);
    const status = await getOnboardingStatus(tenantId);
    expect(status.tourDismissed).toBe(true);
  });

  it('passos são derivados dos dados reais, um a um', async () => {
    const account = await createAccount(tenantId, {
      name: 'Conta Onboarding',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });

    let status = await getOnboardingStatus(tenantId);
    expect(status.steps.find((step) => step.key === 'conta')?.done).toBe(true);
    expect(status.completedCount).toBe(1);

    const category = await createCategory(tenantId, 'Categoria Onboarding');
    status = await getOnboardingStatus(tenantId);
    expect(status.steps.find((step) => step.key === 'categoria')?.done).toBe(true);
    expect(status.completedCount).toBe(2);

    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Primeira despesa',
      amountCents: 1000,
      dueDate: new Date('2026-09-01'),
      accountId: account.id,
      categoryId: category.id,
    });
    status = await getOnboardingStatus(tenantId);
    expect(status.steps.find((step) => step.key === 'primeira_despesa')?.done).toBe(true);
    expect(status.completedCount).toBe(3);
    expect(status.isComplete).toBe(false);

    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Primeira receita',
      amountCents: 5000,
      dueDate: new Date('2026-09-01'),
      accountId: account.id,
    });
    status = await getOnboardingStatus(tenantId);
    expect(status.steps.find((step) => step.key === 'primeira_receita')?.done).toBe(true);
    expect(status.completedCount).toBe(4);
    expect(status.isComplete).toBe(true);
  });

  it('com os 4 passos completos, confirmar funciona e nunca mais reaparece', async () => {
    await confirmChecklist(tenantId);
    const status = await getOnboardingStatus(tenantId);
    expect(status.checklistConfirmed).toBe(true);
  });
});
