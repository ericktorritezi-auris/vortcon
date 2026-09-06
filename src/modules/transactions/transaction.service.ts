import { prisma } from '@/shared/database/client';
import * as transactionRepository from './transaction.repository';

interface CreateTransactionInput {
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  dueDate: Date;
  accountId: string;
  categoryId?: string;
  tagIds?: string[];
  note?: string;
  reminderEnabled?: boolean;
  settlementDate?: Date;
}

/**
 * Validação de ownership (Seção 210): account_id/category_id/tag_id
 * recebidos precisam pertencer ao MESMO tenant do usuário autenticado antes
 * de qualquer leitura/escrita — conhecer o ID não concede acesso (Seção 151).
 */
async function assertOwnership(
  tenantId: string,
  refs: { accountId?: string; categoryId?: string | null; tagIds?: string[] },
): Promise<void> {
  if (refs.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: { id: refs.accountId, tenantId },
      select: { id: true },
    });
    if (!account) {
      throw new Error('Conta não encontrada neste tenant.');
    }
  }

  if (refs.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: refs.categoryId, tenantId },
      select: { id: true },
    });
    if (!category) {
      throw new Error('Categoria não encontrada neste tenant.');
    }
  }

  if (refs.tagIds && refs.tagIds.length > 0) {
    const tagCount = await prisma.tag.count({ where: { id: { in: refs.tagIds }, tenantId } });
    if (tagCount !== refs.tagIds.length) {
      throw new Error('Uma ou mais tags não pertencem a este tenant.');
    }
  }
}

export async function createIncomeOrExpense(tenantId: string, input: CreateTransactionInput) {
  await assertOwnership(tenantId, input);
  return transactionRepository.createTransaction(tenantId, input);
}

interface UpdateTransactionInput {
  description?: string;
  amountCents?: number;
  dueDate?: Date;
  accountId?: string;
  categoryId?: string | null;
  note?: string | null;
  reminderEnabled?: boolean;
  tagIds?: string[];
}

export async function updateTransaction(
  tenantId: string,
  transactionId: string,
  input: UpdateTransactionInput,
) {
  await assertOwnership(tenantId, {
    accountId: input.accountId,
    categoryId: input.categoryId,
    tagIds: input.tagIds,
  });
  return transactionRepository.updateTransaction(tenantId, transactionId, input);
}

export async function settleTransaction(
  tenantId: string,
  transactionId: string,
  settlementDate: Date = new Date(),
) {
  return transactionRepository.settleTransaction(tenantId, transactionId, settlementDate);
}

export async function cancelTransaction(tenantId: string, transactionId: string) {
  return transactionRepository.cancelTransaction(tenantId, transactionId);
}

export async function reactivateTransaction(tenantId: string, transactionId: string) {
  return transactionRepository.reactivateTransaction(tenantId, transactionId);
}

export async function setIgnored(tenantId: string, transactionId: string, ignored: boolean) {
  return transactionRepository.setIgnored(tenantId, transactionId, ignored);
}

export { findTransactionById, listTransactions, setTags } from './transaction.repository';
