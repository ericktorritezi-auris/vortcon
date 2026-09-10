import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import type { FinancialAccount } from '@prisma/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import {
  createAccount,
  deactivateAccount,
  deleteAccount,
  listAccounts,
  reactivateAccount,
  updateAccount,
} from '@/modules/accounts/account.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * CRUD de contas (pedido do cliente): editar, inativa continua na
 * listagem, exclusão de verdade só quando não vinculada.
 */
describe('CRUD de contas', () => {
  let tenantId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Accounts CRUD Owner',
      email: `accountscrud-${suffix}@example.com`,
      username: `accountscrud_${suffix}`,
      planId,
    });
    tenantId = tenant.id;
  });

  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('editar nome e tipo de uma conta', async () => {
    const account = await createAccount(tenantId, {
      name: 'Nome original',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });

    await updateAccount(tenantId, account.id, { name: 'Nome editado', type: 'SAVINGS' });

    const updated = await prisma.financialAccount.findUnique({ where: { id: account.id } });
    expect(updated?.name).toBe('Nome editado');
    expect(updated?.type).toBe('SAVINGS');
  });

  it('conta inativa continua aparecendo na listagem com includeInactive, some sem isso', async () => {
    const account = await createAccount(tenantId, {
      name: 'Vai ser inativada',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    await deactivateAccount(tenantId, account.id);

    const activeOnly = await listAccounts(tenantId);
    expect(activeOnly.some((a: FinancialAccount) => a.id === account.id)).toBe(false);

    const withInactive = await listAccounts(tenantId, true);
    const found = withInactive.find((a: FinancialAccount) => a.id === account.id);
    expect(found).toBeDefined();
    expect(found?.active).toBe(false);

    await reactivateAccount(tenantId, account.id);
    const afterReactivate = await listAccounts(tenantId);
    expect(afterReactivate.some((a: FinancialAccount) => a.id === account.id)).toBe(true);
  });

  it('excluir uma conta vinculada a uma transação é rejeitado', async () => {
    const account = await createAccount(tenantId, {
      name: 'Conta com lançamento',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Vincula a conta',
      amountCents: 1_000,
      dueDate: new Date('2026-09-20'),
      accountId: account.id,
    });

    await expect(deleteAccount(tenantId, account.id)).rejects.toThrow(
      'já tem lançamento, transferência ou recorrência vinculada',
    );
  });

  it('excluir uma conta nunca usada funciona de verdade — sai do banco', async () => {
    const account = await createAccount(tenantId, {
      name: 'Conta nunca usada',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });

    await deleteAccount(tenantId, account.id);

    const deleted = await prisma.financialAccount.findUnique({ where: { id: account.id } });
    expect(deleted).toBeNull();
  });
});
