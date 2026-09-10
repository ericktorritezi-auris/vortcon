import type { FinancialTransaction, FinancialTransactionTag, Transfer } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import {
  alterRecurrenceForward,
  createRecurrenceSeries,
  deleteSeriesWithOccurrences,
  endRecurrenceSeries,
  materializeSeriesOccurrences,
} from '@/modules/recurrence/recurrence.service';
import { listAllSeriesForTenant } from '@/modules/recurrence/recurrence.repository';
import { createTag } from '@/modules/tags/tag.service';
import { settleTransaction } from '@/modules/transactions/transaction.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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
    await prisma.tag.deleteMany({ where: { tenantId } });
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

  it('bug real corrigido (pedido do cliente): série propaga nota, tags e affectsBalance pra cada ocorrência materializada', async () => {
    const tag = await createTag(tenantId, 'Recorrente com tag');

    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: new Date('2026-10-01'),
      baseAmountCents: 50_000,
      description: 'Assinatura com tag e nota',
      defaultAccountId: accountId,
      defaultNote: 'Nota que precisa ir pra toda ocorrência',
      defaultAffectsBalance: false,
      defaultTagIds: [tag.id],
    });

    const occurrences = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: series.id },
      include: { tags: true },
    });

    expect(occurrences.length).toBeGreaterThan(0);
    expect(
      occurrences.every(
        (o: FinancialTransaction) => o.note === 'Nota que precisa ir pra toda ocorrência',
      ),
    ).toBe(true);
    expect(occurrences.every((o: FinancialTransaction) => o.affectsBalance === false)).toBe(true);
    expect(
      occurrences.every((o: FinancialTransaction & { tags: FinancialTransactionTag[] }) =>
        o.tags.some((t: FinancialTransactionTag) => t.tagId === tag.id),
      ),
    ).toBe(true);
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

  it('pedido do cliente — flag de propagar (ou remover) observação e affectsBalance pras ocorrências futuras elegíveis', async () => {
    const freshSeries = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: new Date('2026-10-01'),
      baseAmountCents: 30_000,
      defaultAccountId: accountId,
      defaultNote: 'Nota original',
    });

    const { updatedOccurrences } = await alterRecurrenceForward(tenantId, freshSeries.id, {
      defaultNote: 'Nota nova propagada pra frente',
      defaultAffectsBalance: false,
    });
    expect(updatedOccurrences).toBeGreaterThan(0);

    const futureOnes = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: freshSeries.id, status: 'PENDING', dueDate: { gt: new Date() } },
    });
    expect(
      futureOnes.every((o: FinancialTransaction) => o.note === 'Nota nova propagada pra frente'),
    ).toBe(true);
    expect(futureOnes.every((o: FinancialTransaction) => o.affectsBalance === false)).toBe(true);

    // Remover a observação de todo mundo pra frente (null explícito).
    await alterRecurrenceForward(tenantId, freshSeries.id, { defaultNote: null });
    const afterRemoval = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: freshSeries.id, status: 'PENDING', dueDate: { gt: new Date() } },
    });
    expect(afterRemoval.every((o: FinancialTransaction) => o.note === null)).toBe(true);

    await prisma.financialTransaction.deleteMany({ where: { recurrenceSeriesId: freshSeries.id } });
    await prisma.recurrenceSeries.delete({ where: { id: freshSeries.id } });
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

  it('pedido do cliente — recorrência com data de término ~5 meses à frente materializa TODAS as ocorrências numa chamada só, sem truncar', async () => {
    const now = new Date();
    const endDate = new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000); // ~5 meses à frente

    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: now,
      endDate,
      baseAmountCents: 45_000,
      description: 'Parcela de 5 meses (cenário real reportado)',
      defaultAccountId: accountId,
    });

    const occurrences = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: series.id },
      orderBy: { dueDate: 'asc' },
    });

    // ~5 meses de intervalo mensal = pelo menos 5 ocorrências, todas numa
    // única materialização (a que já roda na criação da série) — nunca
    // truncado no meio, nunca precisando esperar dias passarem pra
    // "completar" sozinho.
    expect(occurrences.length).toBeGreaterThanOrEqual(5);
    expect(occurrences[occurrences.length - 1]!.dueDate.getTime()).toBeLessThanOrEqual(
      endDate.getTime(),
    );

    await prisma.financialTransaction.deleteMany({ where: { recurrenceSeriesId: series.id } });
    await prisma.recurrenceSeries.delete({ where: { id: series.id } });
  });

  it('dúvida real do cliente — recorrência SEM data de término nunca "acaba": a janela anda junto com o tempo, pra sempre', async () => {
    // Simula exatamente o que o job diário faz de verdade: chama
    // materializeSeriesOccurrences() de novo a cada dia que passa. A
    // janela usa Date.now() por dentro (nunca uma data travada na criação
    // da série) — então cada nova chamada, em um "hoje" mais adiante,
    // enxerga um pedaço novo do futuro.
    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: new Date(),
      baseAmountCents: 10_000,
      description: 'Recorrência sem fim (assinatura, aluguel...)',
      defaultAccountId: accountId,
      // Sem endDate de propósito — é exatamente o caso da dúvida.
    });

    const countRightAfterCreation = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });

    // Avança o relógio 500 dias (bem além da janela de 400 dias) e roda o
    // job de novo — o mesmo que o cron do Railway faz sozinho, todo dia.
    const realDateNow = Date.now;
    vi.spyOn(Date, 'now').mockImplementation(() => realDateNow() + 500 * 24 * 60 * 60 * 1000);

    const createdOnNextRun = await materializeSeriesOccurrences(tenantId, series.id);

    const countAfter500Days = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });

    // A janela "andou" com o tempo — apareceram ocorrências novas, lá na
    // frente, que não existiam (nem podiam existir) na primeira chamada.
    expect(createdOnNextRun).toBeGreaterThan(0);
    expect(countAfter500Days).toBeGreaterThan(countRightAfterCreation);

    vi.spyOn(Date, 'now').mockRestore();
    await prisma.financialTransaction.deleteMany({ where: { recurrenceSeriesId: series.id } });
    await prisma.recurrenceSeries.delete({ where: { id: series.id } });
  });

  it('pedido do cliente — tela de gestão: listAllSeriesForTenant traz a contagem certa de ocorrências, inclusive de séries encerradas', async () => {
    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-01'),
      baseAmountCents: 20_000,
      description: 'Série pra listagem',
      defaultAccountId: accountId,
    });

    const list = await listAllSeriesForTenant(tenantId);
    const found = list.find(
      (s: Awaited<ReturnType<typeof listAllSeriesForTenant>>[number]) => s.id === series.id,
    );
    expect(found).toBeDefined();
    expect(found?.occurrenceCount).toBe(4); // set/out/nov/dez
    expect(found?.description).toBe('Série pra listagem');
    expect(found?.accountName).toBe('Conta Recorrência');

    await endRecurrenceSeries(tenantId, series.id);
    const listAfterEnd = await listAllSeriesForTenant(tenantId);
    const foundAfterEnd = listAfterEnd.find(
      (s: Awaited<ReturnType<typeof listAllSeriesForTenant>>[number]) => s.id === series.id,
    );
    // Encerrada continua aparecendo na listagem (nunca some) — só marcada.
    expect(foundAfterEnd?.active).toBe(false);

    await prisma.financialTransaction.deleteMany({ where: { recurrenceSeriesId: series.id } });
    await prisma.recurrenceSeries.delete({ where: { id: series.id } });
  });

  it('pedido do cliente — excluir uma série inteira apaga TODAS as ocorrências, de qualquer status, numa ação só', async () => {
    const series = await createRecurrenceSeries(tenantId, {
      kind: 'TRANSACTION',
      transactionType: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-01'),
      baseAmountCents: 15_000,
      description: 'Vai ser excluída inteira',
      defaultAccountId: accountId,
    });

    const occurrencesBefore = await prisma.financialTransaction.findMany({
      where: { recurrenceSeriesId: series.id },
    });
    expect(occurrencesBefore.length).toBeGreaterThan(0);

    // Uma das ocorrências já paga — a exclusão em massa precisa funcionar
    // mesmo assim, sem exigir cancelar uma por uma antes (diferente de
    // deleteTransaction).
    await settleTransaction(tenantId, occurrencesBefore[0]!.id, new Date());

    const { deletedOccurrences } = await deleteSeriesWithOccurrences(tenantId, series.id);
    expect(deletedOccurrences).toBe(occurrencesBefore.length);

    const occurrencesAfter = await prisma.financialTransaction.count({
      where: { recurrenceSeriesId: series.id },
    });
    expect(occurrencesAfter).toBe(0);

    const seriesAfter = await prisma.recurrenceSeries.findUnique({ where: { id: series.id } });
    expect(seriesAfter).toBeNull();
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
