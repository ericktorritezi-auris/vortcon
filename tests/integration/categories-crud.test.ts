import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import type { Category } from '@prisma/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  listCategories,
  reactivateCategory,
  updateCategory,
} from '@/modules/categories/category.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * CRUD de categorias (pedido do cliente): editar nome/ícone, inativa
 * continua na listagem, exclusão de verdade só quando não vinculada.
 */
describe('CRUD de categorias', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Categories CRUD Owner',
      email: `categoriescrud-${suffix}@example.com`,
      username: `categoriescrud_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta',
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

  it('editar nome e ícone de uma categoria', async () => {
    const category = await createCategory(tenantId, 'Nome original', 'wallet');

    await updateCategory(tenantId, category.id, { name: 'Nome editado', iconKey: 'briefcase' });

    const updated = await prisma.category.findUnique({ where: { id: category.id } });
    expect(updated?.name).toBe('Nome editado');
    expect(updated?.iconKey).toBe('briefcase');
  });

  it('categoria inativa continua aparecendo com includeInactive, some sem isso', async () => {
    const category = await createCategory(tenantId, 'Vai ser inativada');
    await deactivateCategory(tenantId, category.id);

    const activeOnly = await listCategories(tenantId);
    expect(activeOnly.some((c: Category) => c.id === category.id)).toBe(false);

    const withInactive = await listCategories(tenantId, true);
    const found = withInactive.find((c: Category) => c.id === category.id);
    expect(found?.active).toBe(false);

    await reactivateCategory(tenantId, category.id);
    const afterReactivate = await listCategories(tenantId);
    expect(afterReactivate.some((c: Category) => c.id === category.id)).toBe(true);
  });

  it('excluir uma categoria vinculada a uma transação é rejeitado', async () => {
    const category = await createCategory(tenantId, 'Categoria com lançamento');
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Vincula a categoria',
      amountCents: 1_000,
      dueDate: new Date('2026-09-20'),
      accountId,
      categoryId: category.id,
    });

    await expect(deleteCategory(tenantId, category.id)).rejects.toThrow(
      'já tem lançamento ou recorrência vinculada',
    );
  });

  it('excluir uma categoria nunca usada funciona de verdade — sai do banco', async () => {
    const category = await createCategory(tenantId, 'Categoria nunca usada');

    await deleteCategory(tenantId, category.id);

    const deleted = await prisma.category.findUnique({ where: { id: category.id } });
    expect(deleted).toBeNull();
  });
});
