import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory } from '@/modules/categories/category.service';
import {
  createIncomeOrExpense,
  settleTransaction,
  updateTransaction,
} from '@/modules/transactions/transaction.service';
import {
  acknowledgeMonth,
  findUnacknowledgedPreviousMonth,
  getCockpitSummary,
} from '@/modules/cockpit/cockpit.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Cockpit (Seção 86, 88, 89), validado contra PostgreSQL real em CI.
 * Cobre: saldo inicial/posição final corretos entre meses, "correção
 * histórica recalcula Cockpit" (Seção 88) e virada do mês (Seção 89).
 */
describe('Cockpit', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Cockpit Test Owner',
      email: `cockpit-${suffix}@example.com`,
      username: `cockpit_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Cockpit',
      initialBalanceCents: 100_000,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;

    const category = await createCategory(tenantId, 'Categoria Cockpit');
    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.cockpitAcknowledgement.deleteMany({ where: { tenantId } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('saldo inicial de agosto reflete só o que já tinha liquidado até 31/07', async () => {
    const julyIncome = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Receita de julho',
      amountCents: 50_000,
      dueDate: new Date('2026-07-15'),
      accountId,
      categoryId,
    });
    await settleTransaction(tenantId, julyIncome.id, new Date('2026-07-15'));

    const summary = await getCockpitSummary(tenantId, new Date('2026-08-01T00:00:00.000Z'));
    expect(summary.initialBalanceCents).toBe(150_000);
  });

  it('receita liquidada em agosto não entra no saldo inicial de agosto, mas entra na posição final', async () => {
    const augustIncome = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Receita de agosto',
      amountCents: 30_000,
      dueDate: new Date('2026-08-10'),
      accountId,
      categoryId,
    });
    await settleTransaction(tenantId, augustIncome.id, new Date('2026-08-10'));

    const summary = await getCockpitSummary(tenantId, new Date('2026-08-01T00:00:00.000Z'));
    expect(summary.initialBalanceCents).toBe(150_000);
    expect(summary.finalPositionCents).toBe(180_000);
  });

  it('Seção 88 — corrigir uma transação de um mês fechado recalcula o Cockpit automaticamente', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Despesa a corrigir',
      amountCents: 10_000,
      dueDate: new Date('2026-06-05'),
      accountId,
      categoryId,
    });

    const summaryBefore = await getCockpitSummary(tenantId, new Date('2026-06-01T00:00:00.000Z'));
    expect(summaryBefore.expenseCents).toBe(10_000);

    await updateTransaction(tenantId, transaction.id, { amountCents: 25_000 });

    const summaryAfter = await getCockpitSummary(tenantId, new Date('2026-06-01T00:00:00.000Z'));
    expect(summaryAfter.expenseCents).toBe(25_000);
  });

  it('Seção 89 — mês anterior sem acknowledgement é encontrado; depois de confirmado, nunca mais aparece', async () => {
    await prisma.cockpitAcknowledgement.deleteMany({ where: { tenantId } });

    const pending = await findUnacknowledgedPreviousMonth(tenantId);
    expect(pending).not.toBeNull();

    await acknowledgeMonth(tenantId, pending as Date);

    const pendingAfter = await findUnacknowledgedPreviousMonth(tenantId);
    expect(pendingAfter).toBeNull();
  });

  it('destaques de categoria (Seção 87) refletem a movimentação real do mês', async () => {
    const summary = await getCockpitSummary(tenantId, new Date('2026-08-01T00:00:00.000Z'));
    expect(summary.categoryHighlights.biggestIncomeCategoryId).toBe(categoryId);
  });
});
