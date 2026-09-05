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
async function assertBelongsToTenant(
  tenantId: string,
  input: CreateTransactionInput,
): Promise<void> {
  const account = await prisma.financialAccount.findFirst({
    where: { id: input.accountId, tenantId },
    select: { id: true },
  });
  if (!account) {
    throw new Error('Conta não encontrada neste tenant.');
  }

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, tenantId },
      select: { id: true },
    });
    if (!category) {
      throw new Error('Categoria não encontrada neste tenant.');
    }
  }

  if (input.tagIds && input.tagIds.length > 0) {
    const tagCount = await prisma.tag.count({ where: { id: { in: input.tagIds }, tenantId } });
    if (tagCount !== input.tagIds.length) {
      throw new Error('Uma ou mais tags não pertencem a este tenant.');
    }
  }
}

export async function createIncomeOrExpense(tenantId: string, input: CreateTransactionInput) {
  await assertBelongsToTenant(tenantId, input);
  return transactionRepository.createTransaction(tenantId, input);
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
