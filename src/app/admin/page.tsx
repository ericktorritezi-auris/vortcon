import { redirect } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  FileCheck2,
  Receipt,
  ShieldOff,
  UserCheck,
  UserX,
} from 'lucide-react';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import {
  getAdminDashboardMetrics,
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

  const [metrics, recentActivity, alerts] = await Promise.all([
    getAdminDashboardMetrics(),
    listRecentActivity(),
    listAdminAlerts(),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Visão geral</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Tenants" value={metrics.tenantsTotal} icon={Building2} />
            <MetricCard
              label="Ativos"
              value={metrics.tenantsActive}
              icon={UserCheck}
              iconToneClassName="bg-financial-success"
            />
            <MetricCard
              label="Inativos"
              value={metrics.tenantsInactive}
              icon={UserX}
              iconToneClassName="bg-ink-secondary"
            />
            <MetricCard
              label="Bloqueados"
              value={metrics.tenantsBlocked}
              icon={ShieldOff}
              iconToneClassName="bg-financial-danger"
            />
            <MetricCard label="Pagantes" value={metrics.subscriptionsPaid} icon={Receipt} />
            <MetricCard
              label="Isentos"
              value={metrics.subscriptionsExempt}
              icon={Receipt}
              iconToneClassName="bg-financial-info"
            />
            <MetricCard
              label="Mensalidades"
              value={metrics.chargesTotal}
              icon={Receipt}
              iconToneClassName="bg-ink-secondary"
            />
            <MetricCard
              label="Pendentes"
              value={metrics.chargesPending}
              icon={AlertTriangle}
              iconToneClassName="bg-financial-warning"
            />
            <MetricCard
              label="Inadimplentes"
              value={metrics.chargesOverdue}
              icon={AlertTriangle}
              iconToneClassName="bg-financial-danger"
            />
            <MetricCard
              label="Aceites legais"
              value={metrics.legalAcceptancesTotal}
              icon={FileCheck2}
            />
          </div>
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
