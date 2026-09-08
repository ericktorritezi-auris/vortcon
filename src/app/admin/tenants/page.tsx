import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma, SubscriptionCharge, SubscriptionPlan } from '@prisma/client';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { prisma } from '@/shared/database/client';
import { findActivePlans } from '@/modules/plans/plan.service';
import { Badge } from '@/shared/ui';
import { AdminShell } from '../AdminShell';
import { CreateTenantForm } from './CreateTenantForm';

export const dynamic = 'force-dynamic';

type TenantWithOwner = Prisma.TenantGetPayload<{
  include: {
    memberships: { include: { user: true } };
    subscription: { include: { plan: true } };
    accessBlocks: true;
  };
}>;

const FILTER_LABELS: Record<string, string> = {
  ativos: 'Tenants ativos',
  inativos: 'Tenants inativos',
  bloqueados: 'Tenants bloqueados',
  pagantes: 'Assinaturas pagantes',
  isentos: 'Assinaturas isentas',
  pendentes: 'Com mensalidade pendente',
  inadimplentes: 'Inadimplentes',
};

interface AdminTenantsPageProps {
  searchParams: { filtro?: string };
}

/**
 * Listagem de Tenants com filtro (Seção 148 — visibilidade real). Antes,
 * o Dashboard só mostrava números soltos ("1 ativo", "1 isento") sem
 * nenhuma forma de ver QUAIS — a pedido do cliente, cada métrica do
 * Dashboard agora linka pra cá com o filtro correspondente já aplicado.
 */
export default async function AdminTenantsPage({
  searchParams,
}: AdminTenantsPageProps): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const filtro = searchParams.filtro;
  let where: Prisma.TenantWhereInput = {};

  if (filtro === 'ativos') where = { lifecycle: 'ACTIVE' };
  else if (filtro === 'inativos') where = { lifecycle: 'INACTIVE' };
  else if (filtro === 'bloqueados') where = { accessBlocks: { some: { active: true } } };
  else if (filtro === 'pagantes') where = { subscription: { condition: 'PAID' } };
  else if (filtro === 'isentos') where = { subscription: { condition: 'EXEMPT' } };
  else if (filtro === 'pendentes' || filtro === 'inadimplentes') {
    const chargeWhere: Prisma.SubscriptionChargeWhereInput =
      filtro === 'inadimplentes'
        ? { status: 'PENDING', dueDate: { lt: new Date() } }
        : { status: 'PENDING' };
    const charges = await prisma.subscriptionCharge.findMany({
      where: chargeWhere,
      select: { tenantId: true },
      distinct: ['tenantId'],
    });
    where = {
      id: { in: charges.map((charge: Pick<SubscriptionCharge, 'tenantId'>) => charge.tenantId) },
    };
  }

  const [tenants, plans] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        memberships: { include: { user: true } },
        subscription: { include: { plan: true } },
        accessBlocks: { where: { active: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    findActivePlans(),
  ]);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-ink-primary">
          {filtro ? (FILTER_LABELS[filtro] ?? 'Tenants') : 'Tenants'}
        </h1>
        {filtro ? (
          <Link href="/admin/tenants" className="text-sm text-brand-flow hover:underline">
            Ver todos
          </Link>
        ) : null}
      </div>

      <div className="mb-6 flex flex-col gap-3">
        {tenants.map((tenant: TenantWithOwner) => {
          const owner = tenant.memberships[0]?.user;
          const isBlocked = tenant.accessBlocks.length > 0;
          return (
            <Link
              key={tenant.id}
              href={`/admin/tenants/${tenant.id}`}
              className="flex flex-col gap-2 rounded-lg border border-ink-secondary/15 bg-white p-4 hover:border-brand-flow sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-primary">{owner?.name ?? '—'}</p>
                <p className="truncate text-xs text-ink-secondary">
                  {owner?.email} · @{owner?.username}
                </p>
                {tenant.subscription ? (
                  <p className="text-xs text-ink-secondary">
                    {tenant.subscription.plan.name} ·{' '}
                    {tenant.subscription.condition === 'PAID' ? 'Pagante' : 'Isento'}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5">
                <Badge tone={tenant.lifecycle === 'ACTIVE' ? 'success' : 'neutral'}>
                  {tenant.lifecycle === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                </Badge>
                {isBlocked ? <Badge tone="danger">Bloqueado</Badge> : null}
              </div>
            </Link>
          );
        })}
        {tenants.length === 0 ? (
          <p className="text-sm text-ink-secondary">Nenhum tenant encontrado para este filtro.</p>
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
