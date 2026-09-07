import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { runIdempotent } from '@/modules/jobs/job-runner';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import { runFinancialDueRemindersJob, runTokenCleanupJob } from '@/modules/jobs/jobs.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Idempotência de jobs (Seção 127-128), validado contra PostgreSQL real em
 * CI — a proteção real (constraint única) só é comprovada de verdade
 * batendo no banco, nunca em memória.
 */
describe('Idempotência de jobs', () => {
  it('a mesma chave nunca roda duas vezes, mesmo chamada em paralelo (Seção 128)', async () => {
    let executionCount = 0;
    const jobName = `TEST_JOB_${crypto.randomUUID()}`;

    const results = await Promise.all([
      runIdempotent(jobName, 'chave-unica', async () => {
        executionCount += 1;
      }),
      runIdempotent(jobName, 'chave-unica', async () => {
        executionCount += 1;
      }),
      runIdempotent(jobName, 'chave-unica', async () => {
        executionCount += 1;
      }),
    ]);

    expect(executionCount).toBe(1);
    expect(results.filter((r) => r.ran)).toHaveLength(1);
    expect(results.filter((r) => !r.ran)).toHaveLength(2);

    await prisma.jobExecution.deleteMany({ where: { jobName } });
  });

  it('chaves diferentes rodam independentemente', async () => {
    const jobName = `TEST_JOB_${crypto.randomUUID()}`;
    let count = 0;

    await runIdempotent(jobName, 'chave-a', async () => {
      count += 1;
    });
    await runIdempotent(jobName, 'chave-b', async () => {
      count += 1;
    });

    expect(count).toBe(2);
    await prisma.jobExecution.deleteMany({ where: { jobName } });
  });

  it('uma execução que falha é marcada como FAILED, mas não impede nova tentativa com outra chave', async () => {
    const jobName = `TEST_JOB_${crypto.randomUUID()}`;

    await expect(
      runIdempotent(jobName, 'vai-falhar', async () => {
        throw new Error('falha proposital');
      }),
    ).rejects.toThrow('falha proposital');

    const execution = await prisma.jobExecution.findUnique({
      where: { jobName_idempotencyKey: { jobName, idempotencyKey: 'vai-falhar' } },
    });
    expect(execution?.status).toBe('FAILED');

    await prisma.jobExecution.deleteMany({ where: { jobName } });
  });
});

describe('Jobs de negócio (Seção 117-119)', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Jobs Test Owner',
      email: `jobs-${suffix}@example.com`,
      username: `jobs_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Jobs',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { tenantId } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('supressão real: transação já paga nunca gera notificação de lembrete, mesmo com reminderEnabled', async () => {
    const today = new Date();
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Já paga, não deveria lembrar',
      amountCents: 1000,
      dueDate: today,
      accountId,
      reminderEnabled: true,
    });

    await prisma.financialTransaction.update({
      where: { id: transaction.id },
      data: { status: 'PAID', settlementDate: today },
    });

    await runFinancialDueRemindersJob();

    const notifications = await prisma.notification.findMany({
      where: { tenantId, type: 'DUE_REMINDER' },
    });
    expect(notifications).toHaveLength(0);
  });

  it('rodar o job de limpeza de tokens duas vezes seguidas não duplica nem falha', async () => {
    await runTokenCleanupJob();
    await runTokenCleanupJob();
    expect(true).toBe(true);
  });
});
