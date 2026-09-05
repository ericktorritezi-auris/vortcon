import type { SubscriptionCharge } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { recordAuditEvent } from '@/modules/audit/audit.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import * as subscriptionRepository from './subscription.repository';

function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function dueDateForCompetence(competence: Date, dueDay: number): Date {
  return new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth(), dueDay));
}

/**
 * Garante que a cobranca do mes vigente existe (Secao 109). Idempotente -
 * seguro chamar toda vez que a assinatura e consultada. Isento (Secao 108)
 * nunca gera cobranca: "isento sem divida artificial".
 *
 * Isto substitui, por enquanto, um job agendado (Estagio 13 ainda nao
 * existe) - a cobranca "nasce" na primeira consulta do mes, nao num
 * horario fixo. Quando o Estagio 13 chegar, um job diario garante isso sem
 * depender de alguem acessar o sistema.
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

const DELINQUENCY_GRACE_DAYS = 5; // Secao 113: vencimento dia 10, bloqueio dia 15.

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
    const daysPastDue = Math.floor(
      (today.getTime() - charge.dueDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    return daysPastDue >= DELINQUENCY_GRACE_DAYS;
  });

  if (!overdue) return;

  const activeBlocks = await tenantRepository.findActiveBlocks(tenantId);
  const alreadyBlocked = activeBlocks.some((block) => block.type === 'DELINQUENCY');
  if (alreadyBlocked) return;

  const competenceLabel = overdue.competence.toISOString().slice(0, 7);
  await tenantRepository.createBlock(
    tenantId,
    'DELINQUENCY',
    `Mensalidade vencida: competencia ${competenceLabel}`,
  );
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
 */
export async function registerPayment(chargeId: string, adminUserId: string): Promise<void> {
  const charge = await subscriptionRepository.findChargeById(chargeId);
  if (!charge) {
    throw new Error(`Cobranca ${chargeId} nao encontrada.`);
  }

  await subscriptionRepository.markChargePaid(chargeId);

  const activeBlocks = await tenantRepository.findActiveBlocks(charge.tenantId);
  const delinquencyBlock = activeBlocks.find((block) => block.type === 'DELINQUENCY');
  if (delinquencyBlock) {
    await tenantRepository.liftBlock(delinquencyBlock.id);
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
