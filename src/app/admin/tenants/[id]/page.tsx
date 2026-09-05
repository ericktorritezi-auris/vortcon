import { notFound, redirect } from 'next/navigation';
import type { SubscriptionCharge, TenantAccessBlock } from '@prisma/client';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { prisma } from '@/shared/database/client';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import {
  findSubscriptionByTenantId,
  listChargesForTenant,
} from '@/modules/subscriptions/subscription.service';
import { Badge, FinancialValue } from '@/shared/ui';
import { AdminShell } from '../../AdminShell';
import { CreateBlockForm, LiftBlockButton, PayChargeButton } from './TenantActions';

export const dynamic = 'force-dynamic';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface AdminTenantDetailPageProps {
  params: { id: string };
}

export default async function AdminTenantDetailPage({
  params,
}: AdminTenantDetailPageProps): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    include: { memberships: { include: { user: true } } },
  });
  if (!tenant) notFound();

  const owner = tenant.memberships[0]?.user;
  const [subscription, charges, activeBlocks] = await Promise.all([
    findSubscriptionByTenantId(tenant.id),
    listChargesForTenant(tenant.id),
    tenantRepository.findActiveBlocks(tenant.id),
  ]);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-primary">{owner?.name}</h1>
        <p className="text-sm text-ink-secondary">
          {owner?.email} · @{owner?.username}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={tenant.lifecycle === 'ACTIVE' ? 'success' : 'neutral'}>
          {tenant.lifecycle === 'ACTIVE' ? 'Ativo' : 'Inativo'}
        </Badge>
        {activeBlocks.map((block: TenantAccessBlock) => (
          <div key={block.id} className="flex items-center gap-1.5">
            <Badge tone="danger">{block.type}</Badge>
            <LiftBlockButton tenantId={tenant.id} blockId={block.id} />
          </div>
        ))}
      </div>

      <section className="mb-6 rounded-lg border border-ink-secondary/15 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">Assinatura</h2>
        {subscription ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-secondary">Plano</dt>
              <dd className="font-medium text-ink-primary">{subscription.plan.name}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Valor contratado</dt>
              <dd>
                <FinancialValue cents={subscription.contractedPriceCents} />
              </dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Condição</dt>
              <dd className="font-medium text-ink-primary">
                {subscription.condition === 'PAID' ? 'Pago' : 'Isento'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Vencimento</dt>
              <dd className="font-medium text-ink-primary">Dia {subscription.dueDay}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-secondary">Sem assinatura.</p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-ink-secondary/15 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">Mensalidades</h2>
        <div className="flex flex-col divide-y divide-ink-secondary/10">
          {charges.map((charge: SubscriptionCharge) => (
            <div key={charge.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium text-ink-primary">
                  {charge.competence.toISOString().slice(0, 7)}
                </p>
                <p className="text-xs text-ink-secondary">
                  Vencimento: {charge.dueDate.toISOString().slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="money">{currencyFormatter.format(charge.amountCents / 100)}</span>
                <Badge tone={charge.status === 'PAID' ? 'success' : 'warning'}>
                  {charge.status === 'PAID' ? 'Paga' : 'Pendente'}
                </Badge>
                {charge.status === 'PENDING' ? (
                  <PayChargeButton tenantId={tenant.id} chargeId={charge.id} />
                ) : null}
              </div>
            </div>
          ))}
          {charges.length === 0 ? (
            <p className="py-2 text-sm text-ink-secondary">Nenhuma mensalidade ainda.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink-primary">Bloqueio manual</h2>
        <CreateBlockForm tenantId={tenant.id} />
      </section>
    </AdminShell>
  );
}
