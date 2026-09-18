import type { Prisma, SubscriptionCharge } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { recordAuditEvent } from '@/modules/audit/audit.service';
import { appendOutboxEvent } from '@/modules/notifications/outbox.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import * as subscriptionRepository from './subscription.repository';
import { isOverdueEnoughToBlock } from './delinquency-rules';
import { dueDateForCompetence, firstDayOfMonth } from './billing-dates';

/**
 * Garante que a cobranca do mes vigente existe (Secao 109). Idempotente -
 * seguro chamar toda vez que a assinatura e consultada. Isento (Secao 108)
 * nunca gera cobranca: "isento sem divida artificial".
 *
 * Isto substitui, por enquanto, um job agendado (Estagio 13 ainda nao
 * existe) - a cobranca "nasce" na primeira consulta do mes, nao num
 * horario fixo. Quando o Estagio 13 chegar, um job diario garante isso sem
 * depender de alguem acessar o sistema.
 *
 * Evolucao v1.6.1: a PRIMEIRA cobranca de um tenant nunca passa por aqui -
 * ela e criada explicitamente em `provisionTenantWithOwner`, com a data
 * exata que o Admin escolheu (Secao 113), sem nenhum calculo. Esta funcao
 * so entra em acao a partir da 2a competencia em diante, usando `dueDay`
 * (o dia do mes extraido daquela primeira data) contra o mes vigente -
 * exatamente por isso o bug antigo (cobranca nascendo ja vencida) nunca
 * pode se repetir aqui: por definicao, so roda depois que a assinatura ja
 * existe ha pelo menos um mes.
 */
export async function ensureCurrentMonthCharge(tenantId: string): Promise<void> {
  const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
  if (!subscription || subscription.status !== 'ACTIVE' || subscription.condition === 'EXEMPT') {
    return;
  }

  const competence = firstDayOfMonth(new Date());

  const existing = await prisma.subscriptionCharge.findUnique({
    where: { subscriptionId_competence: { subscriptionId: subscription.id, competence } },
  });
  if (existing) return;

  await subscriptionRepository.createCharge({
    subscriptionId: subscription.id,
    tenantId,
    competence,
    amountCents: subscription.contractedPriceCents,
    dueDate: dueDateForCompetence(competence, subscription.dueDay),
  });
}

/**
 * Aplica bloqueio automatico por inadimplencia (Secao 113). Chamado
 * reativamente pelo AccessPolicyService a cada avaliacao de acesso - mesma
 * logica de "substituto de job" descrita em ensureCurrentMonthCharge.
 */
export async function evaluateAndApplyDelinquency(tenantId: string): Promise<void> {
  const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
  if (!subscription || subscription.condition === 'EXEMPT') {
    return;
  }

  const charges = await subscriptionRepository.listChargesForTenant(tenantId);
  const today = new Date();

  const overdue = charges.find((charge: SubscriptionCharge) => {
    if (charge.status !== 'PENDING') return false;
    return isOverdueEnoughToBlock(charge.dueDate, today);
  });

  if (!overdue) return;

  const activeBlocks = await tenantRepository.findActiveBlocks(tenantId);
  const alreadyBlocked = activeBlocks.some((block) => block.type === 'DELINQUENCY');
  if (alreadyBlocked) return;

  const competenceLabel = overdue.competence.toISOString().slice(0, 7);
  const reason = `Mensalidade vencida: competencia ${competenceLabel}`;
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId },
    include: { user: true },
  });

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tenantRepository.createBlock(tenantId, 'DELINQUENCY', reason, tx);
    if (membership) {
      await appendOutboxEvent(tx, 'TenantBlocked', {
        tenantId,
        userId: membership.user.id,
        userEmail: membership.user.email,
        reason,
      });
    }
  });

  await recordAuditEvent({
    actorType: 'SYSTEM',
    tenantId,
    eventType: 'TENANT_BLOCKED_DELINQUENCY',
    entityType: 'TenantAccessBlock',
    metadataSanitized: { competence: competenceLabel },
  });
}

/**
 * Registra pagamento (Secao 110: sempre pelo Admin, PIX externo - o tenant
 * nunca marca a propria mensalidade como paga). Desbloqueio automatico
 * (Secao 114): so levanta bloqueio DELINQUENCY, nunca ADMINISTRATIVE/SECURITY.
 * Evento de outbox (Secao 126) registrado na mesma transacao do UPDATE -
 * o e-mail de confirmacao e enviado depois, de forma assincrona, sem
 * nunca poder desfazer o pagamento se o envio falhar (Secao 124).
 */
export async function registerPayment(chargeId: string, adminUserId: string): Promise<void> {
  const charge = await subscriptionRepository.findChargeById(chargeId);
  if (!charge) {
    throw new Error(`Cobranca ${chargeId} nao encontrada.`);
  }

  const [subscription, membership] = await Promise.all([
    subscriptionRepository.findSubscriptionByTenantId(charge.tenantId),
    prisma.tenantUser.findFirst({ where: { tenantId: charge.tenantId }, include: { user: true } }),
  ]);

  const amountFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  await subscriptionRepository.markChargePaid(chargeId, {
    tenantId: charge.tenantId,
    userId: membership?.user.id ?? '',
    userEmail: membership?.user.email ?? '',
    planName: subscription?.plan.name ?? 'VortCon',
    amountFormatted: amountFormatter.format(charge.amountCents / 100),
  });

  const activeBlocks = await tenantRepository.findActiveBlocks(charge.tenantId);
  const delinquencyBlock = activeBlocks.find((block) => block.type === 'DELINQUENCY');
  if (delinquencyBlock) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tenantRepository.liftBlock(delinquencyBlock.id, tx);
      if (membership) {
        await appendOutboxEvent(tx, 'TenantUnblocked', {
          tenantId: charge.tenantId,
          userId: membership.user.id,
          userEmail: membership.user.email,
        });
      }
    });
  }

  await recordAuditEvent({
    actorType: 'GLOBAL_ADMIN',
    actorId: adminUserId,
    tenantId: charge.tenantId,
    eventType: 'SUBSCRIPTION_CHARGE_PAID',
    entityType: 'SubscriptionCharge',
    entityId: chargeId,
    metadataSanitized: { competence: charge.competence.toISOString().slice(0, 7) },
  });
}

export { findSubscriptionByTenantId, listChargesForTenant } from './subscription.repository';
