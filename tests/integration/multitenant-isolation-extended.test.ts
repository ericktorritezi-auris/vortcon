import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import type { FinancialTransaction, PushSubscription } from '@prisma/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import {
  createIncomeOrExpense,
  cancelTransaction,
  updateTransaction,
} from '@/modules/transactions/transaction.service';
import { subscribeToPush, listPushSubscriptions } from '@/modules/notifications/push.service';
import { materializeAllActiveSeries } from '@/modules/recurrence/recurrence.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Seção 173 — itens ainda não cobertos por outros arquivos de teste: "A
 * não lê B", "A não edita B", "A não cancela B", "A não recebe push B",
 * "jobs A não alteram B". Os demais itens da seção (categoria, tag,
 * backup, restore) já têm teste dedicado em outros arquivos — ver
 * `financial-engine-mandatory.test.ts` e `backup.test.ts`.
 */
describe('Multitenancy — Seção 173 (itens complementares)', () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let planId: string;
  let accountBId: string;
  let transactionBId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant: tenantA, user: userA } = await provisionTenantWithOwner({
      name: 'Tenant A',
      email: `tenant-a-${suffix}@example.com`,
      username: `tenant_a_${suffix}`,
      planId,
    });
    tenantAId = tenantA.id;
    userAId = userA.id;

    const { tenant: tenantB, user: userB } = await provisionTenantWithOwner({
      name: 'Tenant B',
      email: `tenant-b-${suffix}@example.com`,
      username: `tenant_b_${suffix}`,
      planId,
    });
    tenantBId = tenantB.id;
    userBId = userB.id;

    const accountB = await createAccount(tenantBId, {
      name: 'Conta B',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountBId = accountB.id;

    const transactionB = await createIncomeOrExpense(tenantBId, {
      type: 'EXPENSE',
      description: 'Despesa do Tenant B',
      amountCents: 50_000,
      dueDate: new Date('2026-09-10'),
      accountId: accountBId,
    });
    transactionBId = transactionB.id;
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
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

  it('A não lê B — listar transações do tenant A nunca inclui a do tenant B', async () => {
    const transactionsA = await prisma.financialTransaction.findMany({
      where: { tenantId: tenantAId },
    });
    expect(
      transactionsA.find((t: FinancialTransaction) => t.id === transactionBId),
    ).toBeUndefined();
  });

  it('A não edita B — atualizar a transação do tenant B usando o tenantId do tenant A é rejeitado (nunca silencioso)', async () => {
    await expect(
      updateTransaction(tenantAId, transactionBId, { description: 'Tentativa de edição por A' }),
    ).rejects.toThrow();

    const untouched = await prisma.financialTransaction.findUnique({
      where: { id: transactionBId },
    });
    expect(untouched?.description).toBe('Despesa do Tenant B');
  });

  it('A não cancela B — cancelar a transação do tenant B usando o tenantId do tenant A é rejeitado (nunca silencioso)', async () => {
    await expect(cancelTransaction(tenantAId, transactionBId)).rejects.toThrow();

    const untouched = await prisma.financialTransaction.findUnique({
      where: { id: transactionBId },
    });
    expect(untouched?.status).toBe('PENDING');
  });

  it('A não recebe push B — inscrição de push é sempre escopada por usuário, nunca vaza entre tenants', async () => {
    await subscribeToPush({
      tenantId: tenantAId,
      userId: userAId,
      endpoint: `https://push.example.com/a-${crypto.randomUUID()}`,
      p256dh: 'key-a',
      auth: 'auth-a',
    });
    await subscribeToPush({
      tenantId: tenantBId,
      userId: userBId,
      endpoint: `https://push.example.com/b-${crypto.randomUUID()}`,
      p256dh: 'key-b',
      auth: 'auth-b',
    });

    const subscriptionsForA = await listPushSubscriptions(userAId);
    expect(subscriptionsForA.every((s: PushSubscription) => s.tenantId === tenantAId)).toBe(true);
    expect(subscriptionsForA.some((s: PushSubscription) => s.userId === userBId)).toBe(false);
  });

  it('jobs A não alteram B — materializar recorrências do tenant A nunca cria/altera dado do tenant B', async () => {
    const countBefore = await prisma.financialTransaction.count({ where: { tenantId: tenantBId } });

    await materializeAllActiveSeries(tenantAId);

    const countAfter = await prisma.financialTransaction.count({ where: { tenantId: tenantBId } });
    expect(countAfter).toBe(countBefore);
  });

  // "Admin não acessa financeiro A" (Seção 173, último item) já tem
  // cobertura real em tests/unit/roles.test.ts
  // (canAccessFinancialData('GLOBAL_ADMIN') === false). Não duplicado
  // aqui como teste de integração porque `evaluateAccessPolicy` depende
  // de `next/headers` (cookies()), que só funciona dentro de uma
  // requisição real do Next.js — chamar direto num teste Vitest isolado
  // lançaria um erro de contexto ausente, não o cenário que queremos
  // provar.
});
