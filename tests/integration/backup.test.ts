import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory } from '@/modules/categories/category.service';
import { createTag } from '@/modules/tags/tag.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import { exportTenantBackup, restoreTenantBackup } from '@/modules/backup/backup.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Backup e restauração (Seção 142-146), validado contra PostgreSQL real
 * em CI — o ciclo completo exportar -> apagar -> restaurar precisa
 * devolver os dados originais, com as referências (categoria, conta, tag)
 * corretamente religadas mesmo com IDs novos.
 */
describe('Backup e restauração', () => {
  let tenantId: string;
  let otherTenantId: string;
  let planId: string;
  let accountId: string;
  let categoryId: string;
  let tagId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant, user } = await provisionTenantWithOwner({
      name: 'Backup Test Owner',
      email: `backup-${suffix}@example.com`,
      username: `backup_${suffix}`,
      planId,
    });
    tenantId = tenant.id;
    adminUserId = user.id;

    const { tenant: otherTenant } = await provisionTenantWithOwner({
      name: 'Other Tenant Owner',
      email: `backup-other-${suffix}@example.com`,
      username: `backup_other_${suffix}`,
      planId,
    });
    otherTenantId = otherTenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Backup',
      initialBalanceCents: 50_000,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;

    const category = await createCategory(tenantId, 'Categoria Backup');
    categoryId = category.id;

    const tag = await createTag(tenantId, 'Tag Backup');
    tagId = tag.id;

    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Receita original',
      amountCents: 100_000,
      dueDate: new Date('2026-09-01'),
      accountId,
      categoryId,
      tagIds: [tagId],
    });
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Despesa original',
      amountCents: 30_000,
      dueDate: new Date('2026-09-05'),
      accountId,
      categoryId,
    });
  });

  afterAll(async () => {
    await prisma.financialTransactionTag.deleteMany({ where: { transaction: { tenantId } } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.tag.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await cleanupTenant(otherTenantId);
    await deleteTestPlan(planId);
  });

  it('exporta o backup com manifesto correto e conteúdo esperado (Seção 143-144)', async () => {
    const backup = await exportTenantBackup(tenantId);

    expect(backup.manifest.tenantId).toBe(tenantId);
    expect(backup.manifest.manifestVersion).toBe(1);
    expect(backup.data.accounts).toHaveLength(1);
    expect(backup.data.categories).toHaveLength(1);
    expect(backup.data.tags).toHaveLength(1);
    expect(backup.data.transactions).toHaveLength(2);
    expect(backup.data.transactionTags).toHaveLength(1);

    // Seção 143 — nunca inclui dado de outro tenant, senha, sessão, token.
    expect(JSON.stringify(backup)).not.toContain('passwordHash');
    expect(JSON.stringify(backup)).not.toContain(otherTenantId);
  });

  it('rejeita restaurar o backup de um tenant em outro tenant (Seção 144)', async () => {
    const backup = await exportTenantBackup(tenantId);
    const result = await restoreTenantBackup(otherTenantId, backup, adminUserId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('outro tenant');
  });

  it('ciclo completo: exporta, apaga tudo, restaura — dados voltam com referências corretas', async () => {
    const originalBackup = await exportTenantBackup(tenantId);

    // Simula "algo deu errado" — apaga tudo do tenant.
    await prisma.financialTransactionTag.deleteMany({ where: { transaction: { tenantId } } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.tag.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });

    const afterWipe = await prisma.financialTransaction.count({ where: { tenantId } });
    expect(afterWipe).toBe(0);

    const restoreResult = await restoreTenantBackup(tenantId, originalBackup, adminUserId);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.safetyBackup?.data.transactions).toHaveLength(0); // o "antes" da restauração era o estado já apagado

    const restoredTransactions: Array<{
      id: string;
      type: string;
      description: string;
      amountCents: number;
      category: { name: string } | null;
      account: { name: string };
      tags: Array<{ tag: { name: string } }>;
    }> = await prisma.financialTransaction.findMany({
      where: { tenantId },
      include: { category: true, account: true, tags: { include: { tag: true } } },
    });
    expect(restoredTransactions).toHaveLength(2);

    const restoredIncome = restoredTransactions.find((t) => t.type === 'INCOME');
    expect(restoredIncome?.description).toBe('Receita original');
    expect(restoredIncome?.amountCents).toBe(100_000);
    expect(restoredIncome?.category?.name).toBe('Categoria Backup'); // religado com ID NOVO, mesmo conteúdo
    expect(restoredIncome?.account.name).toBe('Conta Backup');
    expect(restoredIncome?.tags.map((t) => t.tag.name)).toEqual(['Tag Backup']);

    const restoredExpense = restoredTransactions.find((t) => t.type === 'EXPENSE');
    expect(restoredExpense?.description).toBe('Despesa original');
    expect(restoredExpense?.amountCents).toBe(30_000);

    // IDs são novos, nunca reaproveitados dos originais.
    expect(restoredIncome?.id).not.toBe(originalBackup.data.transactions[0]?.id);
  });

  it('registra evento de auditoria após restauração (Seção 146)', async () => {
    const backup = await exportTenantBackup(tenantId);
    await restoreTenantBackup(tenantId, backup, adminUserId);

    const auditEvents = await prisma.auditEvent.findMany({
      where: { tenantId, eventType: 'TENANT_BACKUP_RESTORED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditEvents.length).toBeGreaterThan(0);
    expect(auditEvents[0]?.actorId).toBe(adminUserId);
  });
});
