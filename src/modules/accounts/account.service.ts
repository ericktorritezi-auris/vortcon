import { prisma } from '@/shared/database/client';
import type { FinancialAccountType } from '@prisma/client';

export async function listAccounts(tenantId: string) {
  return prisma.financialAccount.findMany({
    where: { tenantId, active: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findAccountById(tenantId: string, accountId: string) {
  return prisma.financialAccount.findFirst({ where: { id: accountId, tenantId } });
}

interface CreateAccountInput {
  name: string;
  type?: FinancialAccountType;
  initialBalanceCents: number;
  initialBalanceDate: Date;
}

export async function createAccount(tenantId: string, input: CreateAccountInput) {
  return prisma.financialAccount.create({
    data: {
      tenantId,
      name: input.name,
      type: input.type ?? 'CHECKING',
      initialBalanceCents: input.initialBalanceCents,
      initialBalanceDate: input.initialBalanceDate,
    },
  });
}

/**
 * Contas em uso preferem inativação (mesmo padrão de categorias, Seção 50)
 * — nunca apagar histórico. `initialBalanceCents` só é alterável enquanto a
 * conta não tem nenhum lançamento (Seção 157) — a checagem fica no service
 * que chama esta função, não aqui, para manter o repositório burro.
 */
export async function deactivateAccount(tenantId: string, accountId: string) {
  return prisma.financialAccount.updateMany({
    where: { id: accountId, tenantId },
    data: { active: false },
  });
}
