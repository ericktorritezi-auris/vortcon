import type { FinancialTransaction } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import { createCategory } from '@/modules/categories/category.service';
import { createTag } from '@/modules/tags/tag.service';
import {
  cancelTransaction,
  createIncomeOrExpense,
  deleteTransaction,
  findTransactionById,
  listTransactions,
  reactivateTransaction,
  settleTransaction,
  unsettleTransaction,
  updateTransaction,
} from '@/modules/transactions/transaction.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Fluxo de transações (Seção 78: editar, pagar/receber, cancelar, reativar)
 * e paginação (Seção 80), validado contra PostgreSQL real em CI.
 */
describe('fluxo de transações', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;
  let categoryId: string;
  let tagId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Transactions Flow Owner',
      email: `transacoes-${suffix}@example.com`,
      username: `transacoes_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Transações',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;

    const category = await createCategory(tenantId, 'Categoria Teste');
    categoryId = category.id;

    const tag = await createTag(tenantId, 'Tag Teste');
    tagId = tag.id;
  });

  afterAll(async () => {
    await prisma.financialTransactionTag.deleteMany({ where: { transaction: { tenantId } } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.tag.deleteMany({ where: { tenantId } });
    await prisma.category.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('cria uma despesa pendente com categoria e tag', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Conta de luz',
      amountCents: 15000,
      dueDate: new Date('2026-09-10'),
      accountId,
      categoryId,
      tagIds: [tagId],
    });

    const found = await findTransactionById(tenantId, transaction.id);
    expect(found?.status).toBe('PENDING');
    expect(found?.category?.id).toBe(categoryId);
    expect(found?.tags).toHaveLength(1);
  });

  it('editar (Seção 78) altera os campos sem tocar em status/liquidação', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Original',
      amountCents: 1000,
      dueDate: new Date('2026-09-11'),
      accountId,
    });

    await updateTransaction(tenantId, transaction.id, {
      description: 'Editada',
      amountCents: 2000,
    });

    const updated = await findTransactionById(tenantId, transaction.id);
    expect(updated?.description).toBe('Editada');
    expect(updated?.amountCents).toBe(2000);
    expect(updated?.status).toBe('PENDING');
  });

  it('editar rejeita categoria de outro tenant (Seção 210 — ownership)', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Para testar ownership',
      amountCents: 1000,
      dueDate: new Date('2026-09-11'),
      accountId,
    });

    const otherPlan = await createTestPlan();
    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant: otherTenant } = await provisionTenantWithOwner({
      name: 'Outro Tenant',
      email: `outro-${suffix}@example.com`,
      username: `outro_${suffix}`,
      planId: otherPlan.id,
    });
    const otherCategory = await createCategory(otherTenant.id, 'Categoria de outro tenant');

    await expect(
      updateTransaction(tenantId, transaction.id, { categoryId: otherCategory.id }),
    ).rejects.toThrow();

    await prisma.category.deleteMany({ where: { tenantId: otherTenant.id } });
    await cleanupTenant(otherTenant.id);
    await deleteTestPlan(otherPlan.id);
  });

  /**
   * Evolução v1.7 (pedido do cliente) — histórico de ajustes de valor
   * (botões +/- da edição). Editar o valor direto não gera histórico
   * nenhum; só editar passando `valueAdjustments` gera lançamentos, cada um
   * com `createdAt` automático (nunca uma data escolhida pelo usuário —
   * mesma filosofia da Seção 113: o sistema sempre confia no "agora" dele
   * mesmo, nunca em data digitada).
   */
  it('editar o valor direto (sem +/-) nao gera historico', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Edição direta de valor',
      amountCents: 1000,
      dueDate: new Date('2026-09-11'),
      accountId,
    });

    await updateTransaction(tenantId, transaction.id, { amountCents: 5000 });

    const updated = await findTransactionById(tenantId, transaction.id);
    expect(updated?.amountCents).toBe(5000);
    expect(updated?.valueAdjustments).toHaveLength(0);
  });

  it('historico do valor (+/-): registra cada ajuste e soma no amountCents', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Imprevistos do mês',
      amountCents: 1, // nasce com 1 centavo (planejamento) — mesmo caso de uso do cliente
      dueDate: new Date('2026-09-30'),
      accountId,
    });

    await updateTransaction(tenantId, transaction.id, {
      amountCents: 1001, // 1 + 1000 (client já soma antes de enviar, como o drawer faz)
      valueAdjustments: [1000],
    });
    await updateTransaction(tenantId, transaction.id, {
      amountCents: 11001, // 1001 + 10000
      valueAdjustments: [10000],
    });

    const afterTwoAdjustments = await findTransactionById(tenantId, transaction.id);
    expect(afterTwoAdjustments?.amountCents).toBe(11001);
    expect(afterTwoAdjustments?.valueAdjustments).toHaveLength(2);
    expect(afterTwoAdjustments?.valueAdjustments.map((item) => item.deltaCents)).toEqual([
      1000, 10000,
    ]);
    // createdAt sempre automático — nunca vem do client (não existe campo pra isso no schema/API).
    for (const item of afterTwoAdjustments?.valueAdjustments ?? []) {
      expect(item.createdAt).toBeInstanceOf(Date);
    }
  });

  it('historico do valor: excluir (✕) um lançamento desfaz exatamente aquele delta', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Imprevistos do mês (com exclusão)',
      amountCents: 1,
      dueDate: new Date('2026-09-30'),
      accountId,
    });

    await updateTransaction(tenantId, transaction.id, {
      amountCents: 10001,
      valueAdjustments: [10000],
    });
    const withOneAdjustment = await findTransactionById(tenantId, transaction.id);
    const adjustmentId = withOneAdjustment!.valueAdjustments[0]!.id;

    // Um segundo ajuste, +500, junto da exclusão do primeiro (+10000) — tudo
    // no mesmo Salvar, exatamente como o drawer faz numa sessão de edição.
    await updateTransaction(tenantId, transaction.id, {
      amountCents: 501, // 10001 - 10000 + 500
      valueAdjustments: [500],
      removeValueAdjustmentIds: [adjustmentId],
    });

    const final = await findTransactionById(tenantId, transaction.id);
    expect(final?.amountCents).toBe(501);
    expect(final?.valueAdjustments).toHaveLength(1);
    expect(final?.valueAdjustments[0]?.deltaCents).toBe(500);
  });

  it('historico do valor: excluir a transação apaga o histórico junto (cascade)', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Vai ser cancelada e excluída',
      amountCents: 1,
      dueDate: new Date('2026-09-30'),
      accountId,
    });

    await updateTransaction(tenantId, transaction.id, {
      amountCents: 501,
      valueAdjustments: [500],
    });

    await cancelTransaction(tenantId, transaction.id);
    await deleteTransaction(tenantId, transaction.id);

    const remaining = await prisma.transactionValueAdjustment.findMany({
      where: { transactionId: transaction.id },
    });
    expect(remaining).toHaveLength(0);
  });

  it('pagar/receber (Seção 78) muda o status e grava a data de liquidação', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'INCOME',
      description: 'Salário',
      amountCents: 500000,
      dueDate: new Date('2026-09-05'),
      accountId,
    });

    await settleTransaction(tenantId, transaction.id);

    const settled = await findTransactionById(tenantId, transaction.id);
    expect(settled?.status).toBe('RECEIVED');
    expect(settled?.settlementDate).not.toBeNull();
  });

  it('desfazer liquidação (pedido do cliente) volta pago/recebido -> pendente e limpa a data', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Marcada como paga por engano',
      amountCents: 8000,
      dueDate: new Date('2026-09-06'),
      accountId,
    });

    await settleTransaction(tenantId, transaction.id);
    const settled = await findTransactionById(tenantId, transaction.id);
    expect(settled?.status).toBe('PAID');

    await unsettleTransaction(tenantId, transaction.id);
    const reverted = await findTransactionById(tenantId, transaction.id);
    expect(reverted?.status).toBe('PENDING');
    expect(reverted?.settlementDate).toBeNull();
  });

  it('desfazer liquidação de uma transação que nunca foi paga é rejeitado', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Nunca foi paga',
      amountCents: 1000,
      dueDate: new Date('2026-09-06'),
      accountId,
    });

    await expect(unsettleTransaction(tenantId, transaction.id)).rejects.toThrow();
  });

  it('cancelar -> reativar (Seção 78) preserva e restaura o status anterior', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Será cancelada e reativada',
      amountCents: 3000,
      dueDate: new Date('2026-09-12'),
      accountId,
      settlementDate: new Date('2026-09-12'),
    });

    const beforeCancel = await findTransactionById(tenantId, transaction.id);
    expect(beforeCancel?.status).toBe('PAID');

    await cancelTransaction(tenantId, transaction.id);
    const cancelled = await findTransactionById(tenantId, transaction.id);
    expect(cancelled?.status).toBe('CANCELLED');
    expect(cancelled?.cancelledFromStatus).toBe('PAID');

    await reactivateTransaction(tenantId, transaction.id);
    const reactivated = await findTransactionById(tenantId, transaction.id);
    expect(reactivated?.status).toBe('PAID');
    expect(reactivated?.cancelledAt).toBeNull();
  });

  it('reativar uma transação que não está cancelada é rejeitado', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Nunca foi cancelada',
      amountCents: 1000,
      dueDate: new Date('2026-09-13'),
      accountId,
    });

    await expect(reactivateTransaction(tenantId, transaction.id)).rejects.toThrow();
  });

  it('paginação (Seção 80) nunca traz mais que 15 registros por página', async () => {
    for (let i = 0; i < 17; i += 1) {
      await createIncomeOrExpense(tenantId, {
        type: 'EXPENSE',
        description: `Paginação ${i}`,
        amountCents: 100,
        dueDate: new Date('2026-09-20'),
        accountId,
      });
    }

    const firstPage = await listTransactions(tenantId, { page: 1 });
    expect(firstPage.items.length).toBeLessThanOrEqual(15);
    expect(firstPage.total).toBeGreaterThanOrEqual(17);
    expect(firstPage.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('filtro por tipo (Seção 76) só retorna a natureza pedida', async () => {
    const onlyExpenses = await listTransactions(tenantId, { type: 'EXPENSE', page: 1 });
    expect(onlyExpenses.items.every((item: FinancialTransaction) => item.type === 'EXPENSE')).toBe(
      true,
    );
  });

  it('pedido do cliente: exclusão de verdade só funciona depois de cancelada', async () => {
    const transaction = await createIncomeOrExpense(tenantId, {
      type: 'EXPENSE',
      description: 'Vai ser excluída',
      amountCents: 1_000,
      dueDate: new Date('2026-09-20'),
      accountId,
    });

    await expect(deleteTransaction(tenantId, transaction.id)).rejects.toThrow(
      'Só é possível excluir uma transação cancelada.',
    );

    await cancelTransaction(tenantId, transaction.id);
    await deleteTransaction(tenantId, transaction.id);

    const deleted = await findTransactionById(tenantId, transaction.id);
    expect(deleted).toBeNull();
  });
});
