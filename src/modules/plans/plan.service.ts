import { prisma } from '@/shared/database/client';

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function findPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

export async function findActivePlans() {
  return prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  });
}

interface CreatePlanInput {
  name: string;
  priceCents: number;
}

export async function createPlan(input: CreatePlanInput) {
  return prisma.subscriptionPlan.create({
    data: { name: input.name, priceCents: input.priceCents },
  });
}

/**
 * Planos não têm feature entitlement (Seção 105) — editar aqui é só nome e
 * preço do catálogo. Nunca altera `contractedPriceCents` de assinaturas já
 * existentes (Seção 107) — quem lê o preço de uma assinatura sempre lê o
 * valor congelado nela, nunca este.
 */
export async function updatePlan(id: string, input: Partial<CreatePlanInput>) {
  return prisma.subscriptionPlan.update({ where: { id }, data: input });
}

/**
 * Inativa em vez de apagar (Seção 102: "histórico impede hard delete quando
 * usado"). Mesmo um plano nunca usado só é inativado — nunca implementamos
 * hard delete de plano, para não haver ambiguidade sobre quando é seguro.
 */
export async function deactivatePlan(id: string) {
  return prisma.subscriptionPlan.update({ where: { id }, data: { active: false } });
}

export async function reactivatePlan(id: string) {
  return prisma.subscriptionPlan.update({ where: { id }, data: { active: true } });
}
