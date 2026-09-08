import type { AuditEvent, SubscriptionCharge, TenantAccessBlock } from '@prisma/client';
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  TENANT_PROVISIONED: 'Novo tenant criado',
  SUBSCRIPTION_CHARGE_PAID: 'Pagamento confirmado',
  TENANT_BLOCKED_DELINQUENCY: 'Tenant bloqueado por inadimplência',
  TENANT_BLOCKED_MANUAL: 'Tenant bloqueado manualmente',
  TENANT_UNBLOCKED_MANUAL: 'Bloqueio levantado',
  ACCOUNT_INITIAL_BALANCE_CHANGED: 'Saldo inicial de conta alterado',
};

export interface RecentActivityItem {
  id: string;
  label: string;
  createdAt: Date;
}

/** Atividade recente (painel de referência do cliente) — direto de audit_events, já existente desde o Estágio 6. */
export async function listRecentActivity(limit = 8): Promise<RecentActivityItem[]> {
  const events = await prisma.auditEvent.findMany({
    where: { visibility: 'ADMIN' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map((event: AuditEvent) => ({
    id: event.id,
    label: EVENT_TYPE_LABELS[event.eventType] ?? event.eventType,
    createdAt: event.createdAt,
  }));
}

export interface AdminAlertItem {
  id: string;
  kind: 'OVERDUE_CHARGE' | 'ACTIVE_BLOCK';
  tenantName: string;
  detail: string;
}
async function resolveTenantOwnerName(tenantId: string): Promise<string> {
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId },
    include: { user: true },
  });
  return membership?.user.name ?? 'Tenant';
}

/** Alertas (painel de referência do cliente) — mensalidades vencidas + bloqueios ativos, com nome do tenant já resolvido. */
export async function listAdminAlerts(limit = 8): Promise<AdminAlertItem[]> {
  const [overdueCharges, activeBlocks] = await Promise.all([
    prisma.subscriptionCharge.findMany({
      where: { status: 'PENDING', dueDate: { lt: new Date() } },
      orderBy: { dueDate: 'asc' },
      take: limit,
    }),
    prisma.tenantAccessBlock.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const overdueItems: AdminAlertItem[] = await Promise.all(
    overdueCharges.map(async (charge: SubscriptionCharge) => ({
      id: `charge-${charge.id}`,
      kind: 'OVERDUE_CHARGE' as const,
      tenantName: await resolveTenantOwnerName(charge.tenantId),
      detail: `Mensalidade vencida — competência ${charge.competence.toISOString().slice(0, 7)}`,
    })),
  );

  const blockItems: AdminAlertItem[] = await Promise.all(
    activeBlocks.map(async (block: TenantAccessBlock) => ({
      id: `block-${block.id}`,
      kind: 'ACTIVE_BLOCK' as const,
      tenantName: await resolveTenantOwnerName(block.tenantId),
      detail: `Bloqueio ativo — ${block.type}`,
    })),
  );

  return [...overdueItems, ...blockItems].slice(0, limit);
}

const MONITORED_JOB_NAMES = [
  'RECURRENCE_MATERIALIZATION',
  'FINANCIAL_DUE_REMINDERS',
  'SUBSCRIPTION_REMINDERS',
  'SUBSCRIPTION_DELINQUENCY_BLOCK',
  'SUBSCRIPTION_OVERDUE_NOTICE',
  'MONTH_ROLLOVER',
  'TOKEN_CLEANUP',
  'OUTBOX_PROCESSING',
  'BACKUP_MAINTENANCE',
] as const;

const JOB_LABELS: Record<(typeof MONITORED_JOB_NAMES)[number], string> = {
  RECURRENCE_MATERIALIZATION: 'Materialização de recorrências',
  FINANCIAL_DUE_REMINDERS: 'Lembretes de vencimento',
  SUBSCRIPTION_REMINDERS: 'Avisos de mensalidade',
  SUBSCRIPTION_DELINQUENCY_BLOCK: 'Bloqueio por inadimplência',
  SUBSCRIPTION_OVERDUE_NOTICE: 'Aviso de atraso',
  MONTH_ROLLOVER: 'Virada do mês',
  TOKEN_CLEANUP: 'Limpeza de tokens',
  OUTBOX_PROCESSING: 'Processamento de outbox',
  BACKUP_MAINTENANCE: 'Manutenção de backup',
};

export interface JobHealthStatus {
  jobName: string;
  label: string;
  lastRunAt: Date | null;
  lastStatus: 'SUCCESS' | 'FAILED' | 'RUNNING' | null;
}

export interface SystemHealth {
  jobs: JobHealthStatus[];
  outboxPending: number;
  outboxFailed: number;
  resendConfigured: boolean;
  pushConfigured: boolean;
  isHealthy: boolean;
}

/**
 * Saúde do sistema (pedido do cliente: "o sistema está funcionando de
 * forma saudável?"). Reaproveita a infraestrutura de jobs/outbox do
 * Estágio 13 — cada job grava sua própria execução em `JobExecution`, então
 * "quando foi a última vez que isso rodou, e deu certo?" já é uma
 * pergunta respondível sem nenhuma tabela nova.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const jobs: JobHealthStatus[] = await Promise.all(
    MONITORED_JOB_NAMES.map(async (jobName) => {
      const last = await prisma.jobExecution.findFirst({
        where: { jobName },
        orderBy: { startedAt: 'desc' },
      });
      return {
        jobName,
        label: JOB_LABELS[jobName],
        lastRunAt: last?.startedAt ?? null,
        lastStatus: last?.status ?? null,
      };
    }),
  );

  const [outboxPending, outboxFailed] = await Promise.all([
    prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
    prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
  ]);

  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const pushConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const anyJobFailed = jobs.some((job) => job.lastStatus === 'FAILED');

  return {
    jobs,
    outboxPending,
    outboxFailed,
    resendConfigured,
    pushConfigured,
    isHealthy: !anyJobFailed && outboxFailed === 0 && resendConfigured && pushConfigured,
  };
}
