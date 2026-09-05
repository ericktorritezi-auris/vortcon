import { prisma } from '@/shared/database/client';
import type { Prisma } from '@prisma/client';

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

export async function createCharge(input: {
  subscriptionId: string;
  tenantId: string;
  competence: Date;
  amountCents: number;
  dueDate: Date;
}) {
  return prisma.subscriptionCharge.create({ data: input });
}

export async function markChargePaid(chargeId: string) {
  return prisma.subscriptionCharge.update({
    where: { id: chargeId },
    data: { status: 'PAID', paidAt: new Date() },
  });
}
