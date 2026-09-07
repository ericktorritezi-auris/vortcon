import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory } from '@/modules/categories/category.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';
import { buildReport, resolveReportFilters } from '@/modules/reports/report.service';
import { buildReportPdf } from '@/modules/reports/report-pdf';
import { buildReportWorkbook } from '@/modules/reports/report-excel';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Relatórios (Seção 94-101), validado contra PostgreSQL real em CI. Cobre
 * o pedido explícito do cliente (período de mais de um mês vem dividido
 * por mês), o relatório por categoria (Seção 96) e a geração real dos dois
 * arquivos de exportação.
 */
describe('Relatórios', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Reports Test Owner',
      email: `reports-${suffix}@example.com`,
      username: `reports_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Relatórios',
      initialBalanceCents: 100_000,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;

    const category = await createCategory(tenantId, 'Empréstimo');
    categoryId = category.id;

    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Recebimento de agosto',
      amountCents: 2_000_000,
      dueDate: new Date('2026-08-10'),
      accountId,
      categoryId,
    });
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Parcela de agosto',
      amountCents: 540_000,
      dueDate: new Date('2026-08-15'),
      accountId,
      categoryId,
    });
    await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Recebimento de setembro',
      amountCents: 1_000_000,
      dueDate: new Date('2026-09-05'),
      accountId,
      categoryId,
    });
  });

  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('período de mais de um mês vem sempre dividido por mês (pedido do cliente)', async () => {
    const result = await buildReport(tenantId, {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-09-30T23:59:59.999Z'),
    });

    expect(result.months).toHaveLength(2);
    expect(result.months[0]?.monthKey).toBe('2026-08');
    expect(result.months[1]?.monthKey).toBe('2026-09');
  });

  it('relatório por categoria (Seção 96) totaliza receitas/despesas/resultado líquido corretamente', async () => {
    const result = await buildReport(tenantId, {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-09-30T23:59:59.999Z'),
      categoryId,
    });

    expect(result.categorySummary?.categoryName).toBe('Empréstimo');
    expect(result.categorySummary?.incomeCents).toBe(3_000_000);
    expect(result.categorySummary?.expenseCents).toBe(540_000);
    expect(result.categorySummary?.netResultCents).toBe(2_460_000);
    expect(result.categorySummary?.incomeCount).toBe(2);
    expect(result.categorySummary?.expenseCount).toBe(1);
  });

  it('resolveReportFilters resolve o nome da categoria a partir do id na URL', async () => {
    const { summary } = await resolveReportFilters(tenantId, {
      de: '2026-08-01',
      ate: '2026-09-30',
      categoria: categoryId,
    });

    expect(summary.categoryLabel).toBe('Empréstimo');
  });

  it('gera um PDF de verdade (template dedicado), com bytes reais', async () => {
    const result = await buildReport(tenantId, {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-09-30T23:59:59.999Z'),
    });

    const pdfBuffer = await buildReportPdf(result, { periodLabel: '01/08/2026 a 30/09/2026' });
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('gera um Excel de verdade, mesmo com descrição maliciosa (Seção 101)', async () => {
    await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: '=cmd|"/c calc"!A1',
      amountCents: 1000,
      dueDate: new Date('2026-08-20'),
      accountId,
    });

    const result = await buildReport(tenantId, {
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-09-30T23:59:59.999Z'),
    });

    const excelBuffer = await buildReportWorkbook(result, {
      periodLabel: '01/08/2026 a 30/09/2026',
    });
    expect(excelBuffer.byteLength).toBeGreaterThan(1000);
    const bytes = new Uint8Array(excelBuffer as ArrayBuffer);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
