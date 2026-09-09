import type { Transfer } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import {
  alterRecurrenceForward,
  createRecurrenceSeries,
  endRecurrenceSeries,
  materializeSeriesOccurrences,
} from '@/modules/recurrence/recurrence.service';
import { settleTransaction } from '@/modules/transactions/transaction.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Fluxo de recorrência (Seções 72-75), validado contra PostgreSQL real em
 * CI. Reproduz o exemplo exato da Seção 72 (base R$ 1.000/dia 14; outubro
 * vira R$ 1.500/dia 15; novembro permanece R$ 1.000/dia 14) e o último item
 * da suíte financeira obrigatória da Seção 170: "recorrência editada em
 * outubro não altera novembro".
 */
describe('fluxo de recorrência', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Recurrence Flow Owner',
      email: `recorrencia-${suffix}@example.com`,
      username: `recorrencia_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Recorrência',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;
  });

  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.recurrenceSeries.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('criar a série já materializa as ocorrências dentro da janela futura', async () => {
    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: new Date('2026-09-14'),
      baseAmountCents: 100_000,
      defaultAccountId: accountId,
    });

    const occurrences = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: series.id },
      orderBy: { dueDate: 'asc' },
    });

    expect(occurrences.length).toBeGreaterThan(0);
    expect(occurrences[0]?.amountCents).toBe(100_000);
    expect(occurrences[0]?.status).toBe('PENDING');
  });

  it('materializar de novo é idempotente — não duplica ocorrências já existentes', async () => {
    const series = await prisma.recurrenceSeries.findFirstOrThrow({ where: { tenantId } });
    const countBefore = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });

    const created = await materializeSeriesOccurrences(tenantId, series.id);

    const countAfter = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });
    expect(created).toBe(0);
    expect(countAfter).toBe(countBefore);
  });

  it('Seção 72 — editar uma ocorrência isolada não altera a série nem as demais ocorrências', async () => {
    const series = await prisma.recurrenceSeries.findFirstOrThrow({ where: { tenantId } });
    const october = await prisma.financialTransaction.findFirstOrThrow({
      where: {
        recurrenceSeriesId: series.id,
        dueDate: { gte: new Date('2026-10-01'), lt: new Date('2026-11-01') },
      },
    });
    const november = await prisma.financialTransaction.findFirst({
      where: {
        recurrenceSeriesId: series.id,
        dueDate: { gte: new Date('2026-11-01'), lt: new Date('2026-12-01') },
      },
    });

    await prisma.financialTransaction.update({
      where: { id: october.id },
      data: { amountCents: 150_000, dueDate: new Date('2026-10-15') },
    });

    const seriesAfter = await prisma.recurrenceSeries.findUniqueOrThrow({
      where: { id: series.id },
    });
    expect(seriesAfter.baseAmountCents).toBe(100_000);

    if (november) {
      const novemberAfter = await prisma.financialTransaction.findUniqueOrThrow({
        where: { id: november.id },
      });
      expect(novemberAfter.amountCents).toBe(100_000);
    }
  });

  it('Seção 170 (último item) — recorrência editada em outubro não altera novembro', async () => {
    const series = await prisma.recurrenceSeries.findFirstOrThrow({ where: { tenantId } });
    await materializeSeriesOccurrences(tenantId, series.id);

    const november = await prisma.financialTransaction.findFirst({
      where: {
        recurrenceSeriesId: series.id,
        dueDate: { gte: new Date('2026-11-01'), lt: new Date('2026-12-01') },
      },
    });

    if (november) {
      expect(november.amountCents).toBe(100_000);
      expect(november.dueDate.getUTCDate()).toBe(14);
    }
  });

  it('Seção 73 — "alterar recorrência" muda a série e as ocorrências futuras elegíveis, nunca as liquidadas', async () => {
    const series = await prisma.recurrenceSeries.findFirstOrThrow({ where: { tenantId } });

    const futureOccurrence = await prisma.financialTransaction.findFirstOrThrow({
      where: { recurrenceSeriesId: series.id, status: 'PENDING', dueDate: { gt: new Date() } },
    });

    const settled = await settleTransaction(tenantId, futureOccurrence.id, new Date());
    const settledAmountBefore = settled.amountCents;

    const { updatedOccurrences } = await alterRecurrenceForward(tenantId, series.id, {
      baseAmountCents: 200_000,
    });

    expect(updatedOccurrences).toBeGreaterThan(0);

    const seriesAfter = await prisma.recurrenceSeries.findUniqueOrThrow({
      where: { id: series.id },
    });
    expect(seriesAfter.baseAmountCents).toBe(200_000);

    const settledAfter = await prisma.financialTransaction.findUniqueOrThrow({
      where: { id: settled.id },
    });
    expect(settledAfter.amountCents).toBe(settledAmountBefore);

    const stillPending = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: series.id, status: 'PENDING', dueDate: { gt: new Date() } },
    });
    for (const occurrence of stillPending) {
      expect(occurrence.amountCents).toBe(200_000);
    }
  });

  it('Seção 74 — encerrar a recorrência para novas ocorrências, sem apagar as já materializadas', async () => {
    const series = await prisma.recurrenceSeries.findFirstOrThrow({ where: { tenantId } });
    const countBefore = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });

    await endRecurrenceSeries(tenantId, series.id);

    const created = await materializeSeriesOccurrences(tenantId, series.id);
    expect(created).toBe(0);

    const countAfter = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });
    expect(countAfter).toBe(countBefore);
  });
});

/**
 * Transferência recorrente (Estágio 16C — lacuna corrigida: o campo
 * `recurrenceSeriesId` existia em `Transfer` desde o Estágio 8, mas nunca
 * teve lógica de materialização real). Validado contra PostgreSQL real.
 */
describe('fluxo de transferência recorrente', () => {
  let tenantId: string;
  let planId: string;
  let sourceAccountId: string;
  let destinationAccountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Transfer Recurrence Owner',
      email: `transfer-rec-${suffix}@example.com`,
      username: `transfer_rec_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const source = await createAccount(tenantId, {
      name: 'Conta Corrente',
      initialBalanceCents: 500_000,
      initialBalanceDate: new Date('2026-01-01'),
    });
    sourceAccountId = source.id;

    const destination = await createAccount(tenantId, {
      name: 'Conta Investimento',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    destinationAccountId = destination.id;
  });

  afterAll(async () => {
    await prisma.transfer.deleteMany({ where: { tenantId } });
    await prisma.recurrenceSeries.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('rejeita série de transferência com a mesma conta de origem e destino', async () => {
    await expect(
      createRecurrenceSeries(tenantId, {
        kind: 'TRANSFER',
        frequency: 'MONTHLY',
        startDate: new Date('2026-09-14'),
        baseAmountCents: 50_000,
        defaultSourceAccountId: sourceAccountId,
        defaultDestinationAccountId: sourceAccountId,
      }),
    ).rejects.toThrow('mesma');
  });

  it('cria a série e já materializa transferências (não transações) dentro da janela futura', async () => {
    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSFER',
      frequency: 'MONTHLY',
      startDate: new Date('2026-09-14'),
      baseAmountCents: 50_000,
      description: 'Aporte mensal',
      defaultSourceAccountId: sourceAccountId,
      defaultDestinationAccountId: destinationAccountId,
    });

    const transfers = await prisma.transfer.findMany({ where: { recurrenceSeriesId: series.id } });
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((t: Transfer) => t.status === 'PENDING')).toBe(true);
    expect(transfers.every((t: Transfer) => t.note === 'Aporte mensal')).toBe(true);
    expect(transfers.every((t: Transfer) => t.sourceAccountId === sourceAccountId)).toBe(true);
    expect(transfers.every((t: Transfer) => t.destinationAccountId === destinationAccountId)).toBe(
      true,
    );

    // Nunca cria FinancialTransaction para uma série de transferência.
    const wrongKindCount = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });
    expect(wrongKindCount).toBe(0);
  });

  it('materializar de novo a mesma série de transferência nunca duplica (idempotência real, constraint única)', async () => {
    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSFER',
      frequency: 'MONTHLY',
      startDate: new Date('2026-09-14'),
      baseAmountCents: 30_000,
      defaultSourceAccountId: sourceAccountId,
      defaultDestinationAccountId: destinationAccountId,
    });

    const countBefore = await prisma.transfer.count({ where: { recurrenceSeriesId: series.id } });

    const createdSecondRun = await materializeSeriesOccurrences(tenantId, series.id);
    expect(createdSecondRun).toBe(0);

    const countAfter = await prisma.transfer.count({ where: { recurrenceSeriesId: series.id } });
    expect(countAfter).toBe(countBefore);
  });
});
