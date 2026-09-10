import { prisma } from '@/shared/database/client';
import type { FinancialAccountType } from '@prisma/client';
import { recordAuditEvent } from '@/modules/audit/audit.service';

/**
 * `includeInactive` (pedido do cliente: conta inativada precisa continuar
 * aparecendo na listagem, só marcada como inativa) — default `false`
 * porque todo OUTRO lugar que usa esta função (seletor de conta ao criar
 * transação/transferência) precisa continuar mostrando só as ativas; só a
 * tela de gerenciamento de contas passa `true`.
 */
export async function listAccounts(tenantId: string, includeInactive = false) {
  return prisma.financialAccount.findMany({
    where: { tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
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

interface UpdateAccountInput {
  name?: string;
  type?: FinancialAccountType;
}

/** Editar nome/tipo (pedido do cliente) — nunca saldo, que passa sempre por updateInitialBalance (auditoria própria). */
export async function updateAccount(
  tenantId: string,
  accountId: string,
  input: UpdateAccountInput,
) {
  return prisma.financialAccount.updateMany({
    where: { id: accountId, tenantId },
    data: { name: input.name, type: input.type },
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

export async function reactivateAccount(tenantId: string, accountId: string) {
  return prisma.financialAccount.updateMany({
    where: { id: accountId, tenantId },
    data: { active: true },
  });
}

/**
 * Excluir de verdade (pedido do cliente: "se uma conta não tiver vinculada
 * a nada, eu posso excluir") — só permitido quando NADA referencia a
 * conta: nenhuma transação, nenhuma transferência (origem ou destino), e
 * nenhuma série recorrente (senão a próxima materialização quebraria).
 * Havendo qualquer vínculo, lança erro explicando — a UI orienta pra
 * inativar em vez disso.
 */
export async function deleteAccount(tenantId: string, accountId: string): Promise<void> {
  const account = await prisma.financialAccount.findFirst({ where: { id: accountId, tenantId } });
  if (!account) throw new Error('Conta não encontrada neste tenant.');

  const [transactionCount, transferCount, recurrenceCount] = await Promise.all([
    prisma.financialTransaction.count({ where: { accountId } }),
    prisma.transfer.count({
      where: { OR: [{ sourceAccountId: accountId }, { destinationAccountId: accountId }] },
    }),
    prisma.recurrenceSeries.count({
      where: {
        OR: [
          { defaultAccountId: accountId },
          { defaultSourceAccountId: accountId },
          { defaultDestinationAccountId: accountId },
        ],
      },
    }),
  ]);

  if (transactionCount > 0 || transferCount > 0 || recurrenceCount > 0) {
    throw new Error(
      'Esta conta já tem lançamento, transferência ou recorrência vinculada — inative em vez de excluir.',
    );
  }

  await prisma.financialAccount.delete({ where: { id: accountId } });
}
