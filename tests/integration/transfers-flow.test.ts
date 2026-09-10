import type { Transfer } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import {
  cancelTransfer,
  completeTransfer,
  createTransfer,
  deleteTransfer,
  listTransfers,
  unsettleTransfer,
} from '@/modules/transfers/transfer.service';
import { getAccountBalances } from '@/modules/financial-engine/financial-engine.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Transferências entre contas (Seção 66-68), validado contra PostgreSQL
 * real em CI. Nunca existia um teste de integração dedicado para este
 * módulo — a matemática de saldo já tinha sido validada via SQL direto
 * durante o desenvolvimento, mas o fluxo completo dos serviços (criar,
 * concluir, desfazer, cancelar) nunca tinha cobertura automatizada.
 */
describe('fluxo de transferências', () => {
  let tenantId: string;
  let planId: string;
  let sourceAccountId: string;
  let destinationAccountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Transfers Flow Owner',
      email: `transfers-${suffix}@example.com`,
      username: `transfers_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const source = await createAccount(tenantId, {
      name: 'Conta Origem',
      initialBalanceCents: 100_000,
      initialBalanceDate: new Date('2026-01-01'),
    });
    sourceAccountId = source.id;

    const destination = await createAccount(tenantId, {
      name: 'Conta Destino',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    destinationAccountId = destination.id;
  });

  afterAll(async () => {
    await prisma.transfer.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('rejeita transferência entre a mesma conta de origem e destino', async () => {
    await expect(
      createTransfer(tenantId, {
        sourceAccountId,
        destinationAccountId: sourceAccountId,
        amountCents: 1000,
        scheduledDate: new Date('2026-09-06'),
      }),
    ).rejects.toThrow();
  });

  it('transferência pendente não altera saldo real (Seção 68)', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 30_000,
      scheduledDate: new Date('2026-09-06'),
    });
    expect(transfer.status).toBe('PENDING');

    const balances = await getAccountBalances(tenantId);
    const source = balances.find((b) => b.accountId === sourceAccountId);
    const destination = balances.find((b) => b.accountId === destinationAccountId);
    expect(source?.balanceCents).toBe(100_000);
    expect(destination?.balanceCents).toBe(0);
  });

  it('concluir uma transferência pendente move o saldo entre as contas', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 20_000,
      scheduledDate: new Date('2026-09-06'),
    });

    await completeTransfer(tenantId, transfer.id);

    const balances = await getAccountBalances(tenantId);
    const destination = balances.find((b) => b.accountId === destinationAccountId);
    expect(destination?.balanceCents).toBeGreaterThanOrEqual(20_000);
  });

  it('transferência já nasce concluída quando settleImmediately é true (fluxo padrão da UI)', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 5_000,
      scheduledDate: new Date('2026-09-06'),
      settleImmediately: true,
    });

    expect(transfer.status).toBe('COMPLETED');
    expect(transfer.settlementDate).not.toBeNull();
  });

  it('desfazer transferência concluída (pedido do cliente) volta a saldo original', async () => {
    const before = await getAccountBalances(tenantId);
    const sourceBefore = before.find((b) => b.accountId === sourceAccountId)?.balanceCents ?? 0;

    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 10_000,
      scheduledDate: new Date('2026-09-06'),
      settleImmediately: true,
    });

    const afterComplete = await getAccountBalances(tenantId);
    expect(afterComplete.find((b) => b.accountId === sourceAccountId)?.balanceCents).toBe(
      sourceBefore - 10_000,
    );

    await unsettleTransfer(tenantId, transfer.id);

    const afterUndo = await getAccountBalances(tenantId);
    expect(afterUndo.find((b) => b.accountId === sourceAccountId)?.balanceCents).toBe(sourceBefore);
  });

  it('desfazer uma transferência que não está concluída é rejeitado', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 1000,
      scheduledDate: new Date('2026-09-06'),
    });

    await expect(unsettleTransfer(tenantId, transfer.id)).rejects.toThrow();
  });

  it('cancelar rejeita uma transferência já concluída (Seção 68)', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 1000,
      scheduledDate: new Date('2026-09-06'),
      settleImmediately: true,
    });

    await expect(cancelTransfer(tenantId, transfer.id)).rejects.toThrow();
  });

  it('cancelar uma transferência pendente funciona normalmente', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 1000,
      scheduledDate: new Date('2026-09-06'),
    });

    const cancelled = await cancelTransfer(tenantId, transfer.id);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).not.toBeNull();
  });

  it('listagem com filtro de período (Seção 66) só retorna transferências dentro do intervalo', async () => {
    await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 1000,
      scheduledDate: new Date('2026-01-15'),
    });

    const septemberOnly = await listTransfers(tenantId, {
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-09-30T23:59:59.999Z'),
    });

    expect(septemberOnly.every((t: Transfer) => t.scheduledDate >= new Date('2026-09-01'))).toBe(
      true,
    );
    expect(
      septemberOnly.some(
        (t: Transfer) => t.amountCents === 1000 && t.scheduledDate < new Date('2026-02-01'),
      ),
    ).toBe(false);
  });

  it('pedido do cliente: exclusão de verdade só funciona depois de cancelada', async () => {
    const transfer = await createTransfer(tenantId, {
      sourceAccountId,
      destinationAccountId,
      amountCents: 5_000,
      scheduledDate: new Date('2026-09-25'),
    });

    await expect(deleteTransfer(tenantId, transfer.id)).rejects.toThrow(
      'Só é possível excluir uma transferência cancelada.',
    );

    await cancelTransfer(tenantId, transfer.id);
    await deleteTransfer(tenantId, transfer.id);

    const deleted = await prisma.transfer.findUnique({ where: { id: transfer.id } });
    expect(deleted).toBeNull();
  });
});
