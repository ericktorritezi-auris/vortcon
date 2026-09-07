import { prisma } from '@/shared/database/client';

interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  scheduledDate: Date;
  note?: string;
  /** Se true, já nasce concluída (Seção 67-68). Padrão: PENDING. */
  settleImmediately?: boolean;
}

async function assertAccountsBelongToTenant(tenantId: string, accountIds: string[]): Promise<void> {
  const count = await prisma.financialAccount.count({
    where: { id: { in: accountIds }, tenantId },
  });
  if (count !== new Set(accountIds).size) {
    throw new Error('Uma ou mais contas não pertencem a este tenant.');
  }
}

/**
 * Transferência (Seção 66-68). Pendente não altera saldo real — o
 * Financial Engine só soma transferências com status COMPLETED (ver
 * `getAccountBalances`). Concluir e cancelar são atômicos (Seção 68).
 */
export async function createTransfer(tenantId: string, input: CreateTransferInput) {
  if (input.sourceAccountId === input.destinationAccountId) {
    throw new Error('A conta de origem e destino não podem ser a mesma.');
  }

  await assertAccountsBelongToTenant(tenantId, [input.sourceAccountId, input.destinationAccountId]);

  return prisma.transfer.create({
    data: {
      tenantId,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      amountCents: input.amountCents,
      scheduledDate: input.scheduledDate,
      note: input.note,
      status: input.settleImmediately ? 'COMPLETED' : 'PENDING',
      settlementDate: input.settleImmediately ? new Date() : undefined,
    },
  });
}

export async function completeTransfer(
  tenantId: string,
  transferId: string,
  settlementDate: Date = new Date(),
) {
  const transfer = await prisma.transfer.findFirstOrThrow({ where: { id: transferId, tenantId } });

  if (transfer.status !== 'PENDING') {
    throw new Error('Só é possível concluir uma transferência pendente.');
  }

  return prisma.transfer.update({
    where: { id: transfer.id },
    data: { status: 'COMPLETED', settlementDate },
  });
}

/**
 * Reverte concluída → pendente — mesmo pedido do cliente que motivou
 * `unsettleTransaction`: "transferido ou não transferido" precisa poder
 * voltar atrás antes de qualquer edição. Diferente de cancelar (que é
 * definitivo e nunca permitido em cima de uma já concluída).
 */
export async function unsettleTransfer(tenantId: string, transferId: string) {
  const transfer = await prisma.transfer.findFirstOrThrow({ where: { id: transferId, tenantId } });

  if (transfer.status !== 'COMPLETED') {
    throw new Error('Só é possível reverter uma transferência concluída.');
  }

  return prisma.transfer.update({
    where: { id: transfer.id },
    data: { status: 'PENDING', settlementDate: null },
  });
}

export async function cancelTransfer(tenantId: string, transferId: string) {
  const transfer = await prisma.transfer.findFirstOrThrow({ where: { id: transferId, tenantId } });

  if (transfer.status === 'COMPLETED') {
    throw new Error('Não é possível cancelar uma transferência já concluída.');
  }

  return prisma.transfer.update({
    where: { id: transfer.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}

interface ListTransfersFilters {
  from?: Date;
  to?: Date;
}

/** Listagem com filtro de período (Seção 66) — mesma navegação de mês de Transações, a pedido do cliente. */
export async function listTransfers(tenantId: string, filters: ListTransfersFilters = {}) {
  return prisma.transfer.findMany({
    where: {
      tenantId,
      ...(filters.from || filters.to
        ? { scheduledDate: { gte: filters.from, lte: filters.to } }
        : {}),
    },
    orderBy: { scheduledDate: 'desc' },
  });
}
