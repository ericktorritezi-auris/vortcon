import type { FinancialTransactionType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';

export async function findTransactionById(tenantId: string, transactionId: string) {
  return prisma.financialTransaction.findFirst({
    where: { id: transactionId, tenantId },
    include: { tags: { include: { tag: true } }, category: true, account: true },
  });
}

export const TRANSACTIONS_PAGE_SIZE = 15; // Seção 80 — máximo, nunca infinite scroll.

interface ListTransactionsFilters {
  from?: Date;
  to?: Date;
  type?: FinancialTransactionType;
  accountId?: string;
  categoryId?: string;
  page?: number;
}

/**
 * Listagem paginada (Seção 76-80). Inclui canceladas de propósito — a
 * ação "reativar" (Seção 78) só faz sentido se a transação ainda aparece
 * em algum lugar da listagem. Isso é diferente do Financial Engine, que
 * sempre exclui canceladas/ignoradas dos cálculos (Seção 59) — listar e
 * calcular são responsabilidades diferentes.
 */
export async function listTransactions(tenantId: string, filters: ListTransactionsFilters = {}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const where: Prisma.FinancialTransactionWhereInput = {
    tenantId,
    ...(filters.from || filters.to ? { dueDate: { gte: filters.from, lte: filters.to } } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      orderBy: { dueDate: 'desc' },
      include: { category: true, tags: { include: { tag: true } } },
      skip: (page - 1) * TRANSACTIONS_PAGE_SIZE,
      take: TRANSACTIONS_PAGE_SIZE,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE)),
  };
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

interface UpdateTransactionData {
  description?: string;
  amountCents?: number;
  dueDate?: Date;
  accountId?: string;
  categoryId?: string | null;
  note?: string | null;
  reminderEnabled?: boolean;
  tagIds?: string[];
}

/**
 * Editar (Seção 78: ação "editar"). Nunca toca em status/settlementDate ou
 * cancelamento — isso é liquidar/cancelar, ações separadas e explícitas.
 */
export async function updateTransaction(
  tenantId: string,
  transactionId: string,
  data: UpdateTransactionData,
) {
  const transaction = await prisma.financialTransaction.findFirst({
    where: { id: transactionId, tenantId },
  });
  if (!transaction) {
    throw new Error(`Transação ${transactionId} não encontrada neste tenant.`);
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.financialTransaction.update({
      where: { id: transactionId },
      data: {
        description: data.description,
        amountCents: data.amountCents,
        dueDate: data.dueDate,
        accountId: data.accountId,
        categoryId: data.categoryId,
        note: data.note,
        reminderEnabled: data.reminderEnabled,
      },
    });

    if (data.tagIds) {
      await tx.financialTransactionTag.deleteMany({ where: { transactionId } });
      if (data.tagIds.length > 0) {
        await tx.financialTransactionTag.createMany({
          data: data.tagIds.map((tagId) => ({ transactionId, tagId })),
        });
      }
    }

    return updated;
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
