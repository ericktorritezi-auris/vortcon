import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileCheck2,
  Receipt,
  ShieldOff,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import {
  getAdminDashboardMetrics,
  getSystemHealth,
  listAdminAlerts,
  listRecentActivity,
} from '@/modules/admin/admin-dashboard.service';
import { MetricCard } from '@/shared/ui';
import { AdminShell } from './AdminShell';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const [metrics, recentActivity, alerts, health] = await Promise.all([
    getAdminDashboardMetrics(),
    listRecentActivity(),
    listAdminAlerts(),
    getSystemHealth(),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Visão geral</h1>

      <section
        className={[
          'mb-6 flex items-center gap-3 rounded-lg border p-4',
          health.isHealthy
            ? 'border-financial-success/30 bg-financial-success/5'
            : 'border-financial-warning/30 bg-financial-warning/5',
        ].join(' ')}
      >
        {health.isHealthy ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-financial-success" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-6 w-6 shrink-0 text-financial-warning" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-semibold text-ink-primary">
            {health.isHealthy ? 'Sistema saudável' : 'Sistema precisa de atenção'}
          </p>
          <p className="text-xs text-ink-secondary">
            {health.isHealthy
              ? 'Todos os jobs, e-mail e push configurados e funcionando.'
              : 'Confira o painel de saúde do sistema abaixo para detalhes.'}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/admin/tenants">
              <MetricCard label="Tenants" value={metrics.tenantsTotal} icon={Building2} />
            </Link>
            <Link href="/admin/tenants?filtro=ativos">
              <MetricCard
                label="Ativos"
                value={metrics.tenantsActive}
                icon={UserCheck}
                iconToneClassName="bg-financial-success"
              />
            </Link>
            <Link href="/admin/tenants?filtro=inativos">
              <MetricCard
                label="Inativos"
                value={metrics.tenantsInactive}
                icon={UserX}
                iconToneClassName="bg-ink-secondary"
              />
            </Link>
            <Link href="/admin/tenants?filtro=bloqueados">
              <MetricCard
                label="Bloqueados"
                value={metrics.tenantsBlocked}
                icon={ShieldOff}
                iconToneClassName="bg-financial-danger"
              />
            </Link>
            <Link href="/admin/tenants?filtro=pagantes">
              <MetricCard label="Pagantes" value={metrics.subscriptionsPaid} icon={Receipt} />
            </Link>
            <Link href="/admin/tenants?filtro=isentos">
              <MetricCard
                label="Isentos"
                value={metrics.subscriptionsExempt}
                icon={Receipt}
                iconToneClassName="bg-financial-info"
              />
            </Link>
            <MetricCard
              label="Mensalidades"
              value={metrics.chargesTotal}
              icon={Receipt}
              iconToneClassName="bg-ink-secondary"
            />
            <Link href="/admin/tenants?filtro=pendentes">
              <MetricCard
                label="Pendentes"
                value={metrics.chargesPending}
                icon={AlertTriangle}
                iconToneClassName="bg-financial-warning"
              />
            </Link>
            <Link href="/admin/tenants?filtro=inadimplentes">
              <MetricCard
                label="Inadimplentes"
                value={metrics.chargesOverdue}
                icon={AlertTriangle}
                iconToneClassName="bg-financial-danger"
              />
            </Link>
            <MetricCard
              label="Aceites legais"
              value={metrics.legalAcceptancesTotal}
              icon={FileCheck2}
            />
          </div>

          <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-primary">Saúde do sistema</h2>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="flex items-center gap-2">
                {health.resendConfigured ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-financial-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-financial-danger" aria-hidden="true" />
                )}
                <span className="text-ink-secondary">E-mail (Resend)</span>
              </div>
              <div className="flex items-center gap-2">
                {health.pushConfigured ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-financial-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-financial-danger" aria-hidden="true" />
                )}
                <span className="text-ink-secondary">Push (VAPID)</span>
              </div>
              <div className="flex items-center gap-2">
                {health.outboxFailed === 0 ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-financial-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-financial-danger" aria-hidden="true" />
                )}
                <span className="text-ink-secondary">Outbox falhos: {health.outboxFailed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-ink-secondary">Outbox pendentes: {health.outboxPending}</span>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {health.jobs.map((job) => (
                <div
                  key={job.jobName}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-ink-primary">{job.label}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {job.lastStatus === 'SUCCESS' ? (
                      <span className="flex items-center gap-1 text-financial-success">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        OK
                      </span>
                    ) : job.lastStatus === 'FAILED' ? (
                      <span className="flex items-center gap-1 text-financial-danger">
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Falhou
                      </span>
                    ) : (
                      <span className="text-ink-secondary">Nunca rodou</span>
                    )}
                    <span className="text-ink-secondary">
                      {job.lastRunAt ? dateFormatter.format(job.lastRunAt) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-primary">Alertas</h2>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-2 py-2.5 text-sm">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-financial-warning"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-ink-primary">{alert.tenantName}</p>
                    <p className="text-xs text-ink-secondary">{alert.detail}</p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 ? (
                <p className="py-2 text-sm text-ink-secondary">Nenhum alerta no momento.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink-primary">Atividade recente</h2>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {recentActivity.map((item) => (
                <div key={item.id} className="py-2.5 text-sm">
                  <p className="text-ink-primary">{item.label}</p>
                  <p className="text-xs text-ink-secondary">
                    {dateFormatter.format(item.createdAt)}
                  </p>
                </div>
              ))}
              {recentActivity.length === 0 ? (
                <p className="py-2 text-sm text-ink-secondary">
                  Nenhuma atividade registrada ainda.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
