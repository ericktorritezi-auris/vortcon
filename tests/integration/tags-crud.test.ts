import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import type { Tag } from '@prisma/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import {
  createTag,
  deactivateTag,
  deleteTag,
  listTags,
  reactivateTag,
  updateTag,
} from '@/modules/tags/tag.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * CRUD de tags (pedido do cliente): editar nome, inativa continua na
 * listagem, exclusão de verdade só quando não vinculada — mais
 * permissivo que conta/categoria (nunca usada nem precisa ficar no
 * banco).
 */
describe('CRUD de tags', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Tags CRUD Owner',
      email: `tagscrud-${suffix}@example.com`,
      username: `tagscrud_${suffix}`,
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
    await prisma.financialTransactionTag.deleteMany({ where: { transaction: { tenantId } } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.tag.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('editar nome de uma tag', async () => {
    const tag = await createTag(tenantId, 'Nome original');

    await updateTag(tenantId, tag.id, 'Nome editado');

    const updated = await prisma.tag.findUnique({ where: { id: tag.id } });
    expect(updated?.name).toBe('Nome editado');
  });

  it('tag inativa continua aparecendo com includeInactive, some sem isso', async () => {
    const tag = await createTag(tenantId, 'Vai ser inativada');
    await deactivateTag(tenantId, tag.id);

    const activeOnly = await listTags(tenantId);
    expect(activeOnly.some((t: Tag) => t.id === tag.id)).toBe(false);

    const withInactive = await listTags(tenantId, true);
    const found = withInactive.find((t: Tag) => t.id === tag.id);
    expect(found?.active).toBe(false);

    await reactivateTag(tenantId, tag.id);
    const afterReactivate = await listTags(tenantId);
    expect(afterReactivate.some((t: Tag) => t.id === tag.id)).toBe(true);
  });

  it('excluir uma tag vinculada a uma transação é rejeitado', async () => {
    const tag = await createTag(tenantId, 'Tag com lançamento');
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Vincula a tag',
      amountCents: 1_000,
      dueDate: new Date('2026-09-20'),
      accountId,
      tagIds: [tag.id],
    });

    await expect(deleteTag(tenantId, tag.id)).rejects.toThrow(
      'já está vinculada a algum lançamento ou recorrência',
    );
  });

  it('excluir uma tag nunca usada funciona de verdade — sai do banco', async () => {
    const tag = await createTag(tenantId, 'Tag nunca usada');

    await deleteTag(tenantId, tag.id);

    const deleted = await prisma.tag.findUnique({ where: { id: tag.id } });
    expect(deleted).toBeNull();
  });
});
