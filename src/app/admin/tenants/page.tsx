import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma, SubscriptionPlan } from '@prisma/client';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { prisma } from '@/shared/database/client';
import { findActivePlans } from '@/modules/plans/plan.service';
import { Badge } from '@/shared/ui';
import { AdminShell } from '../AdminShell';
import { CreateTenantForm } from './CreateTenantForm';

export const dynamic = 'force-dynamic';

type TenantWithOwner = Prisma.TenantGetPayload<{
  include: { memberships: { include: { user: true } } };
}>;

export default async function AdminTenantsPage(): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const [tenants, plans] = await Promise.all([
    prisma.tenant.findMany({
      include: { memberships: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    findActivePlans(),
  ]);

  return (
    <AdminShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Tenants</h1>

      <div className="mb-6 flex flex-col gap-3">
        {tenants.map((tenant: TenantWithOwner) => {
          const owner = tenant.memberships[0]?.user;
          return (
            <Link
              key={tenant.id}
              href={`/admin/tenants/${tenant.id}`}
              className="flex items-center justify-between rounded-lg border border-ink-secondary/15 bg-white p-4 hover:border-brand-flow"
            >
              <div>
                <p className="font-medium text-ink-primary">{owner?.name ?? '—'}</p>
                <p className="text-xs text-ink-secondary">
                  {owner?.email} · @{owner?.username}
                </p>
              </div>
              <Badge tone={tenant.lifecycle === 'ACTIVE' ? 'success' : 'neutral'}>
                {tenant.lifecycle === 'ACTIVE' ? 'Ativo' : 'Inativo'}
              </Badge>
            </Link>
          );
        })}
        {tenants.length === 0 ? (
          <p className="text-sm text-ink-secondary">Nenhum tenant ainda.</p>
        ) : null}
      </div>

      <CreateTenantForm
        plans={plans.map((plan: SubscriptionPlan) => ({
          id: plan.id,
          label: `${plan.name} — R$ ${(plan.priceCents / 100).toFixed(2)}`,
        }))}
      />
    </AdminShell>
  );
}
