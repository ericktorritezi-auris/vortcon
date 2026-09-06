import { prisma } from '@/shared/database/client';

export interface AdminDashboardMetrics {
  tenantsTotal: number;
  tenantsActive: number;
  tenantsInactive: number;
  tenantsBlocked: number;
  subscriptionsPaid: number;
  subscriptionsExempt: number;
  chargesPending: number;
  chargesOverdue: number;
  /** "mensalidades" (Seção 148) — total de cobranças geradas, qualquer status. Distinto de pendentes/inadimplentes. */
  chargesTotal: number;
  legalAcceptancesTotal: number;
}

/**
 * Métricas do painel Admin (Seção 148). Nunca inclui patrimônio privado —
 * só contagens agregadas, nenhum valor de saldo/receita/despesa de tenant.
 */
export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const [
    tenantsTotal,
    tenantsActive,
    tenantsInactive,
    blockedTenantIds,
    subscriptionsPaid,
    subscriptionsExempt,
    chargesPending,
    chargesTotal,
    legalAcceptancesTotal,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { lifecycle: 'ACTIVE' } }),
    prisma.tenant.count({ where: { lifecycle: 'INACTIVE' } }),
    prisma.tenantAccessBlock.findMany({
      where: { active: true },
      select: { tenantId: true },
      distinct: ['tenantId'],
    }),
    prisma.tenantSubscription.count({ where: { condition: 'PAID' } }),
    prisma.tenantSubscription.count({ where: { condition: 'EXEMPT' } }),
    prisma.subscriptionCharge.count({ where: { status: 'PENDING' } }),
    prisma.subscriptionCharge.count(),
    prisma.legalAcceptance.count(),
  ]);

  const overdueCharges = await prisma.subscriptionCharge.count({
    where: { status: 'PENDING', dueDate: { lt: new Date() } },
  });

  return {
    tenantsTotal,
    tenantsActive,
    tenantsInactive,
    tenantsBlocked: blockedTenantIds.length,
    subscriptionsPaid,
    subscriptionsExempt,
    chargesPending,
    chargesOverdue: overdueCharges,
    chargesTotal,
    legalAcceptancesTotal,
  };
}
