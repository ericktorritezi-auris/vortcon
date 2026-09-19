import { prisma } from '@/shared/database/client';
import type { Prisma } from '@prisma/client';
import { appendOutboxEvent } from '@/modules/notifications/outbox.service';

export async function findSubscriptionByTenantId(tenantId: string) {
  return prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
}

export async function listChargesForTenant(tenantId: string) {
  return prisma.subscriptionCharge.findMany({
    where: { tenantId },
    orderBy: { competence: 'desc' },
  });
}

export async function findChargeById(chargeId: string) {
  return prisma.subscriptionCharge.findUnique({ where: { id: chargeId } });
}

interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  contractedPriceCents: number;
  condition: 'PAID' | 'EXEMPT';
  dueDay: number;
}

/** Aceita um client de transação opcional — usado dentro do provisionamento atômico do tenant. */
export async function createSubscription(
  input: CreateSubscriptionInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.tenantSubscription.create({ data: input });
}

interface UpdateSubscriptionData {
  planId?: string;
  contractedPriceCents?: number;
  condition?: 'PAID' | 'EXEMPT';
  dueDay?: number;
}

/**
 * Edição pelo Admin (evolução v1.7.1): plano, condição (Pagante/Isento) e
 * dia de vencimento de uma assinatura já existente. Aceita um client de
 * transação opcional — usado junto com o cancelamento de mensalidades
 * pendentes quando a condição muda pra Isento (ver `updateTenantSubscription`).
 */
export async function updateSubscription(
  tenantId: string,
  data: UpdateSubscriptionData,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.tenantSubscription.update({
    where: { tenantId },
    data: {
      planId: data.planId,
      contractedPriceCents: data.contractedPriceCents,
      condition: data.condition,
      dueDay: data.dueDay,
    },
  });
}

/** Aceita um client de transação opcional — usado pra criar a primeira mensalidade dentro do provisionamento atômico do tenant (Seção 113). */
export async function createCharge(
  input: {
    subscriptionId: string;
    tenantId: string;
    competence: Date;
    amountCents: number;
    dueDate: Date;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.subscriptionCharge.create({ data: input });
}

interface MarkChargePaidContext {
  tenantId: string;
  userId: string;
  userEmail: string;
  planName: string;
  amountFormatted: string;
}

/**
 * Marca a mensalidade como paga e registra o evento de outbox (Seção 126)
 * na MESMA transação — se o processo cair logo após o commit, o evento já
 * está gravado e será processado pelo worker depois; nunca perdido.
 */
export async function markChargePaid(chargeId: string, context: MarkChargePaidContext) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const charge = await tx.subscriptionCharge.update({
      where: { id: chargeId },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await appendOutboxEvent(tx, 'SubscriptionChargePaid', {
      tenantId: context.tenantId,
      chargeId,
      userId: context.userId,
      userEmail: context.userEmail,
      planName: context.planName,
      amountFormatted: context.amountFormatted,
    });

    return charge;
  });
}
