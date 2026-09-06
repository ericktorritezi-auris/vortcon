import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';

export type FactoryResetResult =
  | { kind: 'NOT_CONFIGURED' }
  | { kind: 'ALREADY_USED' }
  | { kind: 'INVALID_TOKEN' }
  | { kind: 'INVALID_CONFIRMATION' }
  | { kind: 'SUCCESS' };

export const FACTORY_RESET_CONFIRMATION_PHRASE = 'RESETAR';

/**
 * Estágio 19 (adicionado à especificação a pedido do cliente). Zera todo
 * dado de teste acumulado durante o desenvolvimento — inclusive o
 * GLOBAL_ADMIN — para que o produto comece 100% limpo para uso real.
 *
 * PRESERVADO de propósito (decisão explícita do cliente, não são "dados de
 * teste"): `subscription_plans` (catálogo comercial real) e
 * `legal_documents`/`legal_document_versions` (texto jurídico real já
 * escrito e publicado). `legal_acceptances` é apagado normalmente — é
 * sempre reconstruído quando os tenants reais aceitarem os termos de novo.
 *
 * Uso único de verdade: a checagem e a gravação do marcador acontecem
 * dentro da mesma transação da limpeza, então não há janela de corrida
 * onde duas chamadas simultâneas com o token certo poderiam rodar o reset
 * duas vezes.
 */
export async function executeFactoryReset(
  providedToken: string,
  confirmationPhrase: string,
): Promise<FactoryResetResult> {
  const expectedToken = process.env.FACTORY_RESET_TOKEN;

  if (!expectedToken) {
    return { kind: 'NOT_CONFIGURED' };
  }

  if (providedToken !== expectedToken) {
    return { kind: 'INVALID_TOKEN' };
  }

  if (confirmationPhrase !== FACTORY_RESET_CONFIRMATION_PHRASE) {
    return { kind: 'INVALID_CONFIRMATION' };
  }

  const alreadyUsed = await prisma.factoryResetLog.findFirst();
  if (alreadyUsed) {
    return { kind: 'ALREADY_USED' };
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Uso único garantido dentro da própria transação: reconfirma que
    // ninguém gravou o marcador entre a checagem acima e agora, e já grava
    // o marcador antes de apagar qualquer coisa — se a limpeza falhar no
    // meio, a transação inteira desfaz, marcador incluso (tudo ou nada).
    const raceCheck = await tx.factoryResetLog.findFirst();
    if (raceCheck) {
      throw new Error('ALREADY_USED_RACE');
    }
    await tx.factoryResetLog.create({ data: {} });

    // Ordem respeita as foreign keys (Seção 156) — filhos antes dos pais.
    await tx.financialTransactionTag.deleteMany({});
    await tx.financialTransaction.deleteMany({});
    await tx.transfer.deleteMany({});
    await tx.recurrenceSeries.deleteMany({});
    await tx.category.deleteMany({});
    await tx.tag.deleteMany({});
    await tx.financialAccount.deleteMany({});

    await tx.legalAcceptance.deleteMany({}); // documentos/versões preservados de propósito

    await tx.subscriptionCharge.deleteMany({});
    await tx.tenantSubscription.deleteMany({}); // catálogo de planos preservado de propósito

    await tx.tenantAccessBlock.deleteMany({});
    await tx.tenantUser.deleteMany({});
    await tx.session.deleteMany({});
    await tx.userInvitation.deleteMany({});
    await tx.passwordResetToken.deleteMany({});
    await tx.auditEvent.deleteMany({});
    await tx.onboardingProgress.deleteMany({}); // Estágio 10 — estado de dispensa é dado de teste, some com o tenant

    await tx.tenant.deleteMany({});
    await tx.user.deleteMany({}); // inclui o GLOBAL_ADMIN — a pedido explícito do cliente
  });

  return { kind: 'SUCCESS' };
}

export async function hasFactoryResetBeenUsed(): Promise<boolean> {
  const record = await prisma.factoryResetLog.findFirst();
  return record !== null;
}
