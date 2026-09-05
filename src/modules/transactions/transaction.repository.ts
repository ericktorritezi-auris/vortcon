import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';

export async function findTransactionById(tenantId: string, transactionId: string) {
  return prisma.financialTransaction.findFirst({
    where: { id: transactionId, tenantId },
    include: { tags: { include: { tag: true } }, category: true, account: true },
  });
}

export async function listTransactions(
  tenantId: string,
  filters: { from?: Date; to?: Date; accountId?: string; categoryId?: string } = {},
) {
  return prisma.financialTransaction.findMany({
    where: {
      tenantId,
      ...(filters.from || filters.to ? { dueDate: { gte: filters.from, lte: filters.to } } : {}),
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    orderBy: { dueDate: 'desc' },
    include: { category: true, tags: { include: { tag: true } } },
  });
}

interface CreateTransactionData {
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  dueDate: Date;
  accountId: string;
  categoryId?: string;
  note?: string;
  reminderEnabled?: boolean;
  settlementDate?: Date;
  tagIds?: string[];
}

export async function createTransaction(tenantId: string, data: CreateTransactionData) {
  const status = data.settlementDate ? (data.type === 'INCOME' ? 'RECEIVED' : 'PAID') : 'PENDING';

  return prisma.financialTransaction.create({
    data: {
      tenantId,
      type: data.type,
      description: data.description,
      amountCents: data.amountCents,
      dueDate: data.dueDate,
      settlementDate: data.settlementDate,
      status,
      accountId: data.accountId,
      categoryId: data.categoryId,
      note: data.note,
      reminderEnabled: data.reminderEnabled ?? false,
      tags: data.tagIds ? { create: data.tagIds.map((tagId) => ({ tagId })) } : undefined,
    },
    include: { tags: true },
  });
}

export async function settleTransaction(
  tenantId: string,
  transactionId: string,
  settlementDate: Date,
) {
  const transaction = await prisma.financialTransaction.findFirstOrThrow({
    where: { id: transactionId, tenantId },
  });

  return prisma.financialTransaction.update({
    where: { id: transaction.id },
    data: {
      status: transaction.type === 'INCOME' ? 'RECEIVED' : 'PAID',
      settlementDate,
    },
  });
}

export async function cancelTransaction(tenantId: string, transactionId: string) {
  const transaction = await prisma.financialTransaction.findFirstOrThrow({
    where: { id: transactionId, tenantId },
  });

  return prisma.financialTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledFromStatus: transaction.status,
    },
  });
}

export async function reactivateTransaction(tenantId: string, transactionId: string) {
  const transaction = await prisma.financialTransaction.findFirstOrThrow({
    where: { id: transactionId, tenantId },
  });

  if (transaction.status !== 'CANCELLED' || !transaction.cancelledFromStatus) {
    throw new Error('Só é possível reativar uma transação cancelada.');
  }

  return prisma.financialTransaction.update({
    where: { id: transaction.id },
    data: {
      status: transaction.cancelledFromStatus,
      cancelledAt: null,
      cancelledFromStatus: null,
    },
  });
}

export async function setIgnored(tenantId: string, transactionId: string, ignored: boolean) {
  return prisma.financialTransaction.updateMany({
    where: { id: transactionId, tenantId },
    data: { ignored },
  });
}

export async function setTags(tenantId: string, transactionId: string, tagIds: string[]) {
  const transaction = await prisma.financialTransaction.findFirst({
    where: { id: transactionId, tenantId },
  });
  if (!transaction) {
    throw new Error(`Transação ${transactionId} não encontrada neste tenant.`);
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.financialTransactionTag.deleteMany({ where: { transactionId } });
    if (tagIds.length > 0) {
      await tx.financialTransactionTag.createMany({
        data: tagIds.map((tagId) => ({ transactionId, tagId })),
      });
    }
  });
}
