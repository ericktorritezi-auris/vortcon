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
import { generateCategoryInsights } from '@/modules/insights/insight-engine.service';
import { resolveIcon } from '@/shared/design-system/icons';
import { FinancialValue, MetricCard } from '@/shared/ui';
import { AppShell } from './AppShell';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';
import { TourModal } from './TourModal';

export const dynamic = 'force-dynamic';

function buildDateFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  });
}

function currentMonthPeriod(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from, to };
}

/** Mesmo mês anterior que o Cockpit usa (Estágio 11) — Insight Engine precisa de base de comparação. */
function previousMonthPeriod(currentFrom: Date): { from: Date; to: Date } {
  const from = new Date(Date.UTC(currentFrom.getUTCFullYear(), currentFrom.getUTCMonth() - 1, 1));
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0, 23, 59, 59, 999));
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
  const previousPeriod = previousMonthPeriod(period.from);
  const firstName = (session?.user.name ?? 'você').split(' ')[0];
  // Seção 24: timezone é cadastrado por usuário (default America/Sao_Paulo,
  // alterável) — "hoje" na saudação usa o fuso do próprio usuário, nunca o
  // do servidor (Railway roda em UTC; sem isso, entre 21h-24h no horário de
  // Brasília a saudação mostraria erroneamente o dia seguinte).
  const dateFormatter = buildDateFormatter(session?.user.timezone ?? 'America/Sao_Paulo');

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
    previousCategoryBreakdown,
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
    getCategoryBreakdown(tenantId, previousPeriod, 'ALL_MOVEMENT'),
    listCategories(tenantId),
    getOnboardingStatus(tenantId),
  ]);

  const insights = await generateCategoryInsights(
    tenantId,
    categoryBreakdown,
    previousCategoryBreakdown,
  );

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

      <section className="mt-6 rounded-lg border border-ink-secondary/15 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-primary">
          <Lightbulb className="h-4 w-4 text-financial-warning" aria-hidden="true" />
          Insights
        </div>
        {insights.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {insights.map((insight) => (
              <li key={insight.categoryId} className="text-sm text-ink-secondary">
                {insight.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-secondary">
            Ainda não há movimentação suficiente neste mês para gerar insights.
          </p>
        )}
      </section>
    </AppShell>
  );
}
