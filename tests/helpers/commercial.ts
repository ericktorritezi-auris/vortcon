import type { TenantUser } from '@prisma/client';
import { prisma } from '@/shared/database/client';

/**
 * Cria um plano descartável para uso em testes de integração — evita
 * depender do seed (Estágio 6) rodar antes da suíte, e cada teste fica
 * dono do próprio dado, sem compartilhar estado entre arquivos de teste.
 */
export async function createTestPlan(priceCents = 4990) {
  return prisma.subscriptionPlan.create({
    data: { name: `Plano de Teste ${crypto.randomUUID().slice(0, 8)}`, priceCents },
  });
}

export async function deleteTestPlan(planId: string): Promise<void> {
  await prisma.subscriptionPlan.delete({ where: { id: planId } }).catch(() => undefined);
}

/**
 * Remove um tenant e tudo que referencia ele, na ordem certa para nunca
 * violar as foreign keys `onDelete: Restrict` (Seção 20-21: nenhuma delação
 * em cascata "por conveniência" no schema de produção — o teste respeita a
 * mesma ordem que qualquer código real precisaria respeitar).
 */
export async function cleanupTenant(tenantId: string): Promise<void> {
  const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  if (subscription) {
    await prisma.subscriptionCharge.deleteMany({ where: { subscriptionId: subscription.id } });
    await prisma.tenantSubscription.delete({ where: { id: subscription.id } });
  }

  await prisma.legalAcceptance.deleteMany({ where: { tenantId } });
  await prisma.tenantAccessBlock.deleteMany({ where: { tenantId } });

  const memberships = await prisma.tenantUser.findMany({ where: { tenantId } });
  const userIds = memberships.map((membership: TenantUser) => membership.userId);

  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userInvitation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.tenantUser.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}
