import { redirect } from 'next/navigation';
import type { SubscriptionCharge } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import {
  findSubscriptionByTenantId,
  listChargesForTenant,
} from '@/modules/subscriptions/subscription.service';
import { Badge, FinancialValue } from '@/shared/ui';
import { AppShell } from '../AppShell';

export const dynamic = 'force-dynamic';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * "Minha Assinatura" (Seção 112). Read-only para status — o tenant nunca
 * marca a própria mensalidade como paga (Seção 110), só vê o histórico e a
 * chave PIX para pagar por fora.
 */
export default async function MySubscriptionPage(): Promise<React.ReactElement> {
  const result = await evaluateAccessPolicy();

  if (result.kind === 'WRONG_AREA_FOR_ADMIN') redirect('/admin');
  if (result.kind === 'TENANT_INACTIVE') redirect('/inativo');
  if (result.kind === 'LEGAL_ACCEPTANCE_REQUIRED') redirect('/aceitar-termos');
  if (result.kind !== 'ALLOWED') redirect('/entrar');

  const [subscription, charges] = await Promise.all([
    findSubscriptionByTenantId(result.context.tenantId),
    listChargesForTenant(result.context.tenantId),
  ]);

  const pixKey = process.env.VORTCON_PIX_KEY;

  return (
    <AppShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Minha assinatura</h1>

      {subscription ? (
        <div className="mb-6 rounded-lg border border-ink-secondary/15 bg-white p-5">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-secondary">Plano</dt>
              <dd className="font-medium text-ink-primary">{subscription.plan.name}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Valor</dt>
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

          {subscription.condition === 'PAID' && pixKey ? (
            <div className="mt-4 rounded-md bg-surface-page p-3">
              <p className="text-xs font-medium text-ink-secondary">Chave PIX para pagamento</p>
              <p className="money text-sm text-ink-primary">{pixKey}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">Nenhuma assinatura encontrada.</p>
      )}

      <h2 className="mb-3 text-sm font-semibold text-ink-primary">Histórico de mensalidades</h2>
      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white px-4">
        {charges.map((charge: SubscriptionCharge) => (
          <div key={charge.id} className="flex items-center justify-between py-3 text-sm">
            <span className="font-medium text-ink-primary">
              {charge.competence.toISOString().slice(0, 7)}
            </span>
            <span className="money text-ink-secondary">
              {currencyFormatter.format(charge.amountCents / 100)}
            </span>
            <Badge tone={charge.status === 'PAID' ? 'success' : 'warning'}>
              {charge.status === 'PAID' ? 'Paga' : 'Pendente'}
            </Badge>
          </div>
        ))}
        {charges.length === 0 ? (
          <p className="py-3 text-sm text-ink-secondary">Nenhuma mensalidade ainda.</p>
        ) : null}
      </div>
    </AppShell>
  );
}
