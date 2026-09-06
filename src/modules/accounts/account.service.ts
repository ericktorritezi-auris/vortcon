import { prisma } from '@/shared/database/client';
import type { FinancialAccountType } from '@prisma/client';
import { recordAuditEvent } from '@/modules/audit/audit.service';

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
 * Alteração de saldo inicial (Seção 157: "permitida com confirmação e
 * auditoria apropriada"). A confirmação é responsabilidade da UI (Estágio
 * 9 — um diálogo de confirmação antes de chamar isto); aqui garantimos a
 * parte que não pode faltar: o evento de auditoria, com o valor antigo e o
 * novo, nunca silencioso.
 */
export async function updateInitialBalance(
  tenantId: string,
  accountId: string,
  newInitialBalanceCents: number,
  actorUserId: string,
) {
  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) {
    throw new Error('Conta não encontrada neste tenant.');
  }

  const previousBalanceCents = account.initialBalanceCents;

  const updated = await prisma.financialAccount.update({
    where: { id: accountId },
    data: { initialBalanceCents: newInitialBalanceCents },
  });

  await recordAuditEvent({
    actorType: 'TENANT_OWNER',
    actorId: actorUserId,
    tenantId,
    eventType: 'ACCOUNT_INITIAL_BALANCE_CHANGED',
    entityType: 'FinancialAccount',
    entityId: accountId,
    // Seção 147: nunca incluir saldo/valor no metadado sanitizado do Admin —
    // isso é dado financeiro privado do tenant, mesmo em auditoria.
    metadataSanitized: { changed: true },
  });

  return { updated, previousBalanceCents };
}

/**
 * Contas em uso preferem inativação (mesmo padrão de categorias, Seção 50)
 * — nunca apagar histórico.
 */
export async function deactivateAccount(tenantId: string, accountId: string) {
  return prisma.financialAccount.updateMany({
    where: { id: accountId, tenantId },
    data: { active: false },
  });
}
