import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory, getCategoryReport } from '@/modules/categories/category.service';
import { createTag, getTagReport } from '@/modules/tags/tag.service';
import {
  cancelTransaction,
  createIncomeOrExpense,
  setIgnored,
  settleTransaction,
} from '@/modules/transactions/transaction.service';
import { createTransfer } from '@/modules/transfers/transfer.service';
import {
  getCategoryBreakdown,
  getPeriodResult,
  getRealBalance,
} from '@/modules/financial-engine/financial-engine.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Suíte obrigatória do Master Document — Seções 170 (financeiro), 171
 * (categoria bidirecional), 172 (tag bidirecional). Cada `it` abaixo
 * corresponde a um item explicitamente listado nessas seções, na mesma
 * ordem, para que a rastreabilidade com a especificação seja direta.
 */
describe('Financial Engine — testes obrigatórios (Seções 170-172)', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;
  const septemberPeriod = { from: new Date('2026-09-01'), to: new Date('2026-09-30') };

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Financial Engine Test',
      email: `finengine-${suffix}@example.com`,
      username: `finengine_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Teste',
      initialBalanceCents: 1_000_000,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;
  });

  afterAll(async () => {
    await prisma.financialTransactionTag.deleteMany({ where: { transaction: { tenantId } } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.transfer.deleteMany({ where: { tenantId } });
    await prisma.tag.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('receita pendente não aumenta saldo', async () => {
    const balanceBefore = await getRealBalance(tenantId);

    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Receita pendente',
      amountCents: 500_000,
      dueDate: new Date('2026-09-10'),
      accountId,
    });

    const balanceAfter = await getRealBalance(tenantId);
    expect(balanceAfter).toBe(balanceBefore);
  });

  it('despesa pendente não reduz saldo', async () => {
    const balanceBefore = await getRealBalance(tenantId);

    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Despesa pendente',
      amountCents: 200_000,
      dueDate: new Date('2026-09-10'),
      accountId,
    });

    const balanceAfter = await getRealBalance(tenantId);
    expect(balanceAfter).toBe(balanceBefore);
  });

  it('receita recebida aumenta saldo', async () => {
    const balanceBefore = await getRealBalance(tenantId);

    const income = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Receita a receber',
      amountCents: 300_000,
      dueDate: new Date('2026-09-15'),
      accountId,
    });
    await settleTransaction(tenantId, income.id, new Date('2026-09-15'));

    const balanceAfter = await getRealBalance(tenantId);
    expect(balanceAfter).toBe(balanceBefore + 300_000);
  });

  it('despesa paga reduz saldo', async () => {
    const balanceBefore = await getRealBalance(tenantId);

    const expense = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Despesa a pagar',
      amountCents: 150_000,
      dueDate: new Date('2026-09-16'),
      accountId,
    });
    await settleTransaction(tenantId, expense.id, new Date('2026-09-16'));

    const balanceAfter = await getRealBalance(tenantId);
    expect(balanceAfter).toBe(balanceBefore - 150_000);
  });

  it('despesa de setembro paga em outubro pertence ao resultado de setembro; caixa muda em outubro', async () => {
    const septemberResultBefore = await getPeriodResult(tenantId, septemberPeriod);
    const balanceBefore = await getRealBalance(tenantId);

    const expense = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Conta que vence em setembro',
      amountCents: 100_000,
      dueDate: new Date('2026-09-28'),
      accountId,
    });

    // Resultado de setembro já reflete a despesa por competência, mesmo sem pagamento.
    const septemberResultAfterCreate = await getPeriodResult(tenantId, septemberPeriod);
    expect(septemberResultAfterCreate).toBe(septemberResultBefore - 100_000);

    // Paga em outubro — o caixa (saldo real) só muda agora, em outubro.
    await settleTransaction(tenantId, expense.id, new Date('2026-10-05'));

    const balanceAfterPayment = await getRealBalance(tenantId);
    expect(balanceAfterPayment).toBe(balanceBefore - 100_000);

    // O resultado de setembro continua o mesmo — a despesa não migrou de competência.
    const septemberResultAfterPayment = await getPeriodResult(tenantId, septemberPeriod);
    expect(septemberResultAfterPayment).toBe(septemberResultAfterCreate);
  });

  it('transferência não muda consolidado (é neutra no resultado)', async () => {
    const account2 = await createAccount(tenantId, {
      name: 'Conta Destino',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });

    const resultBefore = await getPeriodResult(tenantId, septemberPeriod);
    const totalBalanceBefore = await getRealBalance(tenantId);

    await createTransfer(tenantId, {
      sourceAccountId: accountId,
      destinationAccountId: account2.id,
      amountCents: 50_000,
      scheduledDate: new Date('2026-09-20'),
      settleImmediately: true,
    });

    const resultAfter = await getPeriodResult(tenantId, septemberPeriod);
    const totalBalanceAfter = await getRealBalance(tenantId);

    // Resultado (receitas - despesas) nunca é afetado por transferência.
    expect(resultAfter).toBe(resultBefore);
    // Saldo total do tenant também não muda — sai de uma conta, entra em outra.
    expect(totalBalanceAfter).toBe(totalBalanceBefore);
  });

  it('transferência pendente não muda saldo', async () => {
    const account3 = await createAccount(tenantId, {
      name: 'Conta Pendente',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });

    const balanceBefore = await getRealBalance(tenantId);

    await createTransfer(tenantId, {
      sourceAccountId: accountId,
      destinationAccountId: account3.id,
      amountCents: 20_000,
      scheduledDate: new Date('2026-09-25'),
    });

    const balanceAfter = await getRealBalance(tenantId);
    expect(balanceAfter).toBe(balanceBefore);
  });

  it('cancelado não conta', async () => {
    const balanceBefore = await getRealBalance(tenantId);

    const income = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Será cancelada',
      amountCents: 999_000,
      dueDate: new Date('2026-09-05'),
      accountId,
      settlementDate: new Date('2026-09-05'), // nasce já recebida
    });

    const balanceAfterSettled = await getRealBalance(tenantId);
    expect(balanceAfterSettled).toBe(balanceBefore + 999_000);

    await cancelTransaction(tenantId, income.id);

    const balanceAfterCancel = await getRealBalance(tenantId);
    expect(balanceAfterCancel).toBe(balanceBefore);
  });

  it('ignorado não conta', async () => {
    const balanceBefore = await getRealBalance(tenantId);

    const income = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Será ignorada',
      amountCents: 777_000,
      dueDate: new Date('2026-09-06'),
      accountId,
      settlementDate: new Date('2026-09-06'),
    });

    await setIgnored(tenantId, income.id, true);

    const balanceAfterIgnored = await getRealBalance(tenantId);
    expect(balanceAfterIgnored).toBe(balanceBefore);
  });

  it('Seção 171 — categoria bidirecional: mesma categoria em receita e despesa', async () => {
    const category = await createCategory(tenantId, 'Empréstimo');

    const income = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Empréstimo recebido',
      amountCents: 2_000_000,
      dueDate: new Date('2026-09-12'),
      accountId,
      categoryId: category.id,
    });

    const expense = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Parcela do empréstimo',
      amountCents: 500_000,
      dueDate: new Date('2026-09-12'),
      accountId,
      categoryId: category.id,
    });

    const report = await getCategoryReport(tenantId, category.id, septemberPeriod);

    expect(report.incomeTotalCents).toBe(2_000_000);
    expect(report.expenseTotalCents).toBe(500_000);
    expect(report.netResultCents).toBe(1_500_000);

    // Não existe category.type — a categoria em si não tem natureza.
    expect((category as unknown as { type?: unknown }).type).toBeUndefined();

    // Filtro por natureza filtra a TRANSAÇÃO, não a categoria.
    const incomeOnly = await getCategoryBreakdown(tenantId, septemberPeriod, 'INCOME_ONLY');
    const expenseOnly = await getCategoryBreakdown(tenantId, septemberPeriod, 'EXPENSE_ONLY');
    const incomeRow = incomeOnly.find((row) => row.categoryId === category.id);
    const expenseRow = expenseOnly.find((row) => row.categoryId === category.id);

    expect(incomeRow?.incomeTotalCents).toBe(2_000_000);
    expect(incomeRow?.expenseTotalCents).toBe(0);
    expect(expenseRow?.expenseTotalCents).toBe(500_000);
    expect(expenseRow?.incomeTotalCents).toBe(0);

    // Cancelado/ignorado não contam mesmo dentro do relatório de categoria.
    await cancelTransaction(tenantId, expense.id);
    const reportAfterCancel = await getCategoryReport(tenantId, category.id, septemberPeriod);
    expect(reportAfterCancel.expenseTotalCents).toBe(0);
    expect(reportAfterCancel.incomeTotalCents).toBe(2_000_000);

    await setIgnored(tenantId, income.id, true);
    const reportAfterIgnore = await getCategoryReport(tenantId, category.id, septemberPeriod);
    expect(reportAfterIgnore.incomeTotalCents).toBe(0);
  });

  it('Seção 172 — tag bidirecional: mesma tag em receita e despesa, isolamento tenant', async () => {
    const tag = await createTag(tenantId, 'Reembolsável');

    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Reembolso recebido',
      amountCents: 80_000,
      dueDate: new Date('2026-09-18'),
      accountId,
      tagIds: [tag.id],
    });
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Gasto reembolsável',
      amountCents: 30_000,
      dueDate: new Date('2026-09-18'),
      accountId,
      tagIds: [tag.id],
    });

    const report = await getTagReport(tenantId, tag.id, septemberPeriod);

    expect(report.incomeTotalCents).toBe(80_000);
    expect(report.expenseTotalCents).toBe(30_000);
    expect(report.netResultCents).toBe(50_000);
    expect((tag as unknown as { type?: unknown }).type).toBeUndefined();

    // Isolamento tenant: outro tenant não enxerga esta tag.
    const otherPlan = await createTestPlan();
    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant: otherTenant } = await provisionTenantWithOwner({
      name: 'Outro Tenant',
      email: `outrotenant-${suffix}@example.com`,
      username: `outrotenant_${suffix}`,
      planId: otherPlan.id,
    });

    const tagFromOtherTenant = await prisma.tag.findFirst({
      where: { id: tag.id, tenantId: otherTenant.id },
    });
    expect(tagFromOtherTenant).toBeNull();

    await cleanupTenant(otherTenant.id);
    await deleteTestPlan(otherPlan.id);
  });
});
