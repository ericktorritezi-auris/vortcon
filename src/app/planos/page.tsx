import { Check, Zap } from 'lucide-react';
import Link from 'next/link';
import type { SubscriptionPlan } from '@prisma/client';
import { findActivePlans } from '@/modules/plans/plan.service';
import { Footer, Header } from '@/shared/ui';
import { fraunces } from '@/shared/marketing/fonts';

export const metadata = {
  title: 'Planos — VortCon',
  description: 'Conheça os planos do VortCon e comece a organizar sua vida financeira.',
};

export const dynamic = 'force-dynamic';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const PERIODICITY_LABEL: Record<string, string> = {
  MONTHLY: '/mês',
  YEARLY: '/ano',
};

const PLAN_FEATURES = [
  'Contas, categorias e tags ilimitadas',
  'Transações, transferências e recorrências',
  'Cockpit mensal com comparação automática',
  'Relatórios em PDF e Excel',
  'Lembretes de vencimento e notificações push',
  'Login por biometria e app instalável',
];

/**
 * Página de planos (Seção 136, Estágio 16A) — SEMPRE alimentada pelo
 * banco (findActivePlans), nunca hardcoded: se um plano novo for
 * cadastrado pelo Admin, aparece aqui automaticamente, sem precisar
 * tocar nesta página. Design customizado por cima do dado, não uma
 * tabela crua. CTA é "Entrar" — não existe checkout self-service no V1.
 */
export default async function PlanosPage(): Promise<React.ReactElement> {
  const plans = await findActivePlans();

  return (
    <div className={`flex min-h-screen flex-col ${fraunces.variable}`}>
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center lg:py-20">
          <h1
            className="mb-5 text-4xl leading-[1.1] text-brand-deep sm:text-5xl"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Um plano simples, sem letra pequena.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-ink-secondary">
            Pagamento via Pix, sem burocracia. Sem taxa de adesão, sem contrato de fidelidade.
          </p>
        </section>

        <section className="border-t border-ink-secondary/10 bg-white px-6 py-16">
          <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-8">
            {plans.map((plan: SubscriptionPlan) => (
              <div
                key={plan.id}
                className="w-full max-w-sm rounded-2xl border border-brand-deep/15 bg-surface-page p-8 shadow-lg shadow-brand-deep/5"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-brand-flow" aria-hidden="true" />
                  <span className="text-sm font-medium text-ink-secondary">{plan.name}</span>
                </div>
                <p className="mb-1 flex items-baseline gap-1">
                  <span
                    className="text-4xl text-brand-deep"
                    style={{ fontFamily: 'var(--font-fraunces)' }}
                  >
                    {currencyFormatter.format(plan.priceCents / 100)}
                  </span>
                  <span className="text-ink-secondary">
                    {PERIODICITY_LABEL[plan.periodicity] ?? ''}
                  </span>
                </p>
                <p className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-brand-flow/10 px-3 py-1 text-xs font-medium text-brand-flow">
                  Pagamento via Pix
                </p>

                <ul className="mb-8 flex flex-col gap-2.5">
                  {PLAN_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink-primary">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-flow"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/entrar"
                  className="block w-full rounded-md bg-brand-deep px-6 py-3 text-center text-sm font-medium text-white hover:bg-brand-deep/90"
                >
                  Já sou cliente — Entrar
                </Link>
              </div>
            ))}

            {plans.length === 0 ? (
              <p className="text-center text-ink-secondary">Nenhum plano disponível no momento.</p>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
