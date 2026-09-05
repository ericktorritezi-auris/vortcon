import { redirect } from 'next/navigation';
import type { SubscriptionPlan } from '@prisma/client';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { listPlans } from '@/modules/plans/plan.service';
import { AdminShell } from '../AdminShell';
import { PlansManager } from './PlansManager';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage(): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const plans = await listPlans();

  return (
    <AdminShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Planos</h1>
      <PlansManager
        plans={plans.map((plan: SubscriptionPlan) => ({
          id: plan.id,
          name: plan.name,
          priceCents: plan.priceCents,
          active: plan.active,
        }))}
      />
    </AdminShell>
  );
}
