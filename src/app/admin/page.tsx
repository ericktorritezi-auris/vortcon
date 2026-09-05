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
import { getAdminDashboardMetrics } from '@/modules/admin/admin-dashboard.service';
import { MetricCard } from '@/shared/ui';
import { AdminShell } from './AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const metrics = await getAdminDashboardMetrics();

  return (
    <AdminShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Visão geral</h1>
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
          label="Mensalidades pendentes"
          value={metrics.chargesPending}
          icon={AlertTriangle}
          iconToneClassName="bg-financial-warning"
        />
        <MetricCard
          label="Mensalidades vencidas"
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
    </AdminShell>
  );
}
