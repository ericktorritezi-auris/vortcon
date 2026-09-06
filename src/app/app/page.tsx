import { redirect } from 'next/navigation';
import { Lightbulb, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type {
  AccountBalance,
  CategoryBreakdownRow,
} from '@/modules/financial-engine/financial-engine.service';
import type { Category, FinancialAccount } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { getCurrentSession } from '@/modules/auth/session.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { listCategories } from '@/modules/categories/category.service';
import {
  getAccountBalances,
  getCategoryBreakdown,
  getPendingPayables,
  getPendingReceivables,
  getPeriodExpenses,
  getPeriodIncome,
  getProjectedBalance,
  getRealBalance,
} from '@/modules/financial-engine/financial-engine.service';
import { getOnboardingStatus } from '@/modules/onboarding/onboarding.service';
import { resolveIcon } from '@/shared/design-system/icons';
import { FinancialValue, MetricCard } from '@/shared/ui';
import { AppShell } from './AppShell';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';
import { TourModal } from './TourModal';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function currentMonthPeriod(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from, to };
}

/**
 * Dashboard (Seção 81-85). Default mês atual. Saudação com primeiro nome +
 * data de hoje. Métricas completas da Seção 82. "Novo usuário" (Seção 84):
 * nunca cria dado fictício — um tenant sem nada mostra zeros reais, com o
 * onboarding em destaque, não números inventados para parecer populado.
 */
export default async function DashboardPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();

  switch (access.kind) {
    case 'UNAUTHENTICATED':
      redirect('/entrar');
    case 'WRONG_AREA_FOR_ADMIN':
      redirect('/admin');
    case 'TENANT_INACTIVE':
      redirect('/inativo');
    case 'DELINQUENCY_BLOCKED':
    case 'ADMIN_BLOCKED':
    case 'SECURITY_BLOCKED':
      redirect('/bloqueado');
    case 'LEGAL_ACCEPTANCE_REQUIRED':
      redirect('/aceitar-termos');
    case 'ALLOWED':
      break;
  }

  const { tenantId } = access.context;
  const session = await getCurrentSession();
  const period = currentMonthPeriod();
  const firstName = (session?.user.name ?? 'você').split(' ')[0];

  const [
    realBalanceCents,
    periodIncomeCents,
    periodExpensesCents,
    pendingPayablesCents,
    pendingReceivablesCents,
    projectedBalanceCents,
    accountBalances,
    accounts,
    categoryBreakdown,
    categories,
    onboarding,
  ] = await Promise.all([
    getRealBalance(tenantId),
    getPeriodIncome(tenantId, period),
    getPeriodExpenses(tenantId, period),
    getPendingPayables(tenantId),
    getPendingReceivables(tenantId),
    getProjectedBalance(tenantId),
    getAccountBalances(tenantId),
    listAccounts(tenantId),
    getCategoryBreakdown(tenantId, period, 'ALL_MOVEMENT'),
    listCategories(tenantId),
    getOnboardingStatus(tenantId),
  ]);

  const periodResultCents = periodIncomeCents - periodExpensesCents;
  const showProjected = pendingPayablesCents > 0 || pendingReceivablesCents > 0;

  const accountsById = new Map<string, FinancialAccount>(
    accounts.map((account: FinancialAccount) => [account.id, account]),
  );
  const categoriesById = new Map<string, Category>(
    categories.map((category: Category) => [category.id, category]),
  );

  return (
    <AppShell>
      {!onboarding.tourDismissed ? <TourModal /> : null}

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-primary">Olá, {firstName}!</h1>
        <p className="text-sm text-ink-secondary">
          Hoje estamos no dia {dateFormatter.format(new Date())}.
        </p>
      </div>

      {!onboarding.checklistConfirmed ? (
        <div className="mb-6">
          <OnboardingChecklistCard status={onboarding} />
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Saldo real"
          value={<FinancialValue cents={realBalanceCents} />}
          icon={Wallet}
        />
        <MetricCard
          label="Receitas do mês"
          value={<FinancialValue cents={periodIncomeCents} />}
          icon={TrendingUp}
          iconToneClassName="bg-financial-success"
        />
        <MetricCard
          label="Despesas do mês"
          value={<FinancialValue cents={periodExpensesCents} />}
          icon={TrendingDown}
          iconToneClassName="bg-financial-danger"
        />
        <MetricCard
          label="Resultado do mês"
          value={
            <FinancialValue
              cents={periodResultCents}
              showSign
              tone={periodResultCents >= 0 ? 'positive' : 'negative'}
            />
          }
          icon={Wallet}
        />
        <MetricCard
          label="Pendente a pagar"
          value={<FinancialValue cents={pendingPayablesCents} />}
          icon={TrendingDown}
          iconToneClassName="bg-financial-warning"
        />
        <MetricCard
          label="Pendente a receber"
          value={<FinancialValue cents={pendingReceivablesCents} />}
          icon={TrendingUp}
          iconToneClassName="bg-financial-info"
        />
        {showProjected ? (
          <MetricCard
            label="Saldo projetado"
            value={<FinancialValue cents={projectedBalanceCents} />}
            icon={Wallet}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">Saldo por conta</h2>
          <div className="flex flex-col divide-y divide-ink-secondary/10">
            {accountBalances.map((balance: AccountBalance) => (
              <div
                key={balance.accountId}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-ink-primary">
                  {accountsById.get(balance.accountId)?.name ?? '—'}
                </span>
                <FinancialValue cents={balance.balanceCents} />
              </div>
            ))}
            {accountBalances.length === 0 ? (
              <p className="py-2 text-sm text-ink-secondary">Nenhuma conta cadastrada ainda.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">
            Movimentação por categoria
          </h2>
          <div className="flex flex-col divide-y divide-ink-secondary/10">
            {categoryBreakdown.map((row: CategoryBreakdownRow) => {
              const category = categoriesById.get(row.categoryId);
              const CategoryIcon = resolveIcon(category?.iconKey);
              return (
                <div
                  key={row.categoryId}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="flex items-center gap-2 text-ink-primary">
                    <CategoryIcon className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
                    {category?.name ?? '—'}
                  </span>
                  <FinancialValue
                    cents={row.netResultCents}
                    showSign
                    tone={row.netResultCents >= 0 ? 'positive' : 'negative'}
                  />
                </div>
              );
            })}
            {categoryBreakdown.length === 0 ? (
              <p className="py-2 text-sm text-ink-secondary">
                Nenhuma movimentação neste mês ainda.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-dashed border-ink-secondary/25 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
          <Lightbulb className="h-4 w-4 text-financial-warning" aria-hidden="true" />
          Insights
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          O motor de insights chega em um estágio futuro (Insight Engine). Por enquanto, acompanhe
          suas métricas acima.
        </p>
      </section>
    </AppShell>
  );
}
