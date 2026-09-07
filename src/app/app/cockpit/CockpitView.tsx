'use client';

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatMonthLabel, shiftMonthParam } from '@/shared/period';
import { Button, FinancialValue, MetricCard } from '@/shared/ui';
import type { CockpitSummary } from '@/modules/cockpit/cockpit.service';
import { CategoryPieChart } from './CategoryPieChart';

interface SimpleOption {
  id: string;
  name: string;
}

interface CockpitViewProps {
  summary: CockpitSummary;
  categories: SimpleOption[];
  period: { from: string; to: string };
  unacknowledgedMonth: string | null;
}

function ComparisonBar({
  label,
  currentCents,
  previousCents,
}: {
  label: string;
  currentCents: number;
  previousCents: number;
}): React.ReactElement {
  const maxCents = Math.max(currentCents, previousCents, 1);
  const currentPercent = Math.round((currentCents / maxCents) * 100);
  const previousPercent = Math.round((previousCents / maxCents) * 100);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-ink-secondary">Este mês</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-page">
          <div
            className="h-full rounded-full bg-brand-flow"
            style={{ width: `${currentPercent}%` }}
          />
        </div>
        <FinancialValue cents={currentCents} className="w-24 shrink-0 text-right text-xs" />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-ink-secondary">Mês anterior</span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-page">
          <div
            className="h-full rounded-full bg-ink-secondary/40"
            style={{ width: `${previousPercent}%` }}
          />
        </div>
        <FinancialValue cents={previousCents} className="w-24 shrink-0 text-right text-xs" />
      </div>
    </div>
  );
}

/**
 * Cockpit (Seção 86-90) — resumo mensal analítico. Destaques de categoria
 * (Seção 87), comparações e gráficos simples (barras, sem dependência
 * externa) contra o mês anterior. Aviso de virada do mês (Seção 89)
 * aparece só quando há um mês fechado ainda não confirmado.
 */
export function CockpitView({
  summary,
  categories,
  period,
  unacknowledgedMonth,
}: CockpitViewProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [acknowledging, setAcknowledging] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const monthLabel = formatMonthLabel(new Date(period.from));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  function navigateMonth(direction: 1 | -1): void {
    const monthValue = shiftMonthParam(period.from, direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', monthValue);
    router.push(`/app/cockpit?${params.toString()}`);
  }

  async function handleAcknowledge(): Promise<void> {
    if (!unacknowledgedMonth) return;
    setAcknowledging(true);
    try {
      await fetch('/api/cockpit/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: unacknowledgedMonth }),
      });
      setDismissedBanner(true);
      router.refresh();
    } finally {
      setAcknowledging(false);
    }
  }

  const highlightEntries: { label: string; categoryId: string | null }[] = [
    { label: 'Maior saída', categoryId: summary.categoryHighlights.biggestExpenseCategoryId },
    { label: 'Maior entrada', categoryId: summary.categoryHighlights.biggestIncomeCategoryId },
    {
      label: 'Maior resultado positivo',
      categoryId: summary.categoryHighlights.biggestPositiveNetCategoryId,
    },
    {
      label: 'Maior resultado negativo',
      categoryId: summary.categoryHighlights.biggestNegativeNetCategoryId,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {unacknowledgedMonth && !dismissedBanner ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-brand-flow/30 bg-brand-flow/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-brand-flow" aria-hidden="true" />
            <p className="text-sm text-ink-primary">
              Seu resumo financeiro de {formatMonthLabel(new Date(unacknowledgedMonth))} está
              pronto.
            </p>
          </div>
          <Button size="sm" onClick={handleAcknowledge} loading={acknowledging}>
            Ok, entendi
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-primary">Cockpit</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            aria-label="Mês anterior"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-ink-primary">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            aria-label="Próximo mês"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="Saldo inicial"
          value={<FinancialValue cents={summary.initialBalanceCents} />}
          icon={Wallet}
        />
        <MetricCard
          label="Receitas"
          value={<FinancialValue cents={summary.incomeCents} />}
          icon={TrendingUp}
          iconToneClassName="bg-financial-success"
        />
        <MetricCard
          label="Despesas"
          value={<FinancialValue cents={summary.expenseCents} />}
          icon={TrendingDown}
          iconToneClassName="bg-financial-danger"
        />
        <MetricCard
          label="Resultado"
          value={<FinancialValue cents={summary.resultCents} showSign />}
          icon={Wallet}
        />
        <MetricCard
          label="Posição final"
          value={<FinancialValue cents={summary.finalPositionCents} />}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <h2 className="mb-4 text-sm font-semibold text-ink-primary">
            Comparação com o mês anterior
          </h2>
          <div className="flex flex-col gap-5">
            <ComparisonBar
              label="Receitas"
              currentCents={summary.incomeCents}
              previousCents={summary.previousMonth.incomeCents}
            />
            <ComparisonBar
              label="Despesas"
              currentCents={summary.expenseCents}
              previousCents={summary.previousMonth.expenseCents}
            />
          </div>
        </section>

        <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">Destaques por categoria</h2>
          <div className="flex flex-col divide-y divide-ink-secondary/10">
            {highlightEntries.map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="text-ink-secondary">{entry.label}</span>
                <span className="font-medium text-ink-primary">
                  {entry.categoryId ? (categoriesById.get(entry.categoryId)?.name ?? '—') : '—'}
                </span>
              </div>
            ))}
            <div className="py-2">
              <p className="mb-1.5 text-xs text-ink-secondary">Cresceram em despesas</p>
              <p className="text-sm text-ink-primary">
                {summary.categoryHighlights.expenseGrowthCategoryIds.length > 0
                  ? summary.categoryHighlights.expenseGrowthCategoryIds
                      .map((id) => categoriesById.get(id)?.name ?? '—')
                      .join(', ')
                  : 'Nenhuma'}
              </p>
            </div>
            <div className="py-2">
              <p className="mb-1.5 text-xs text-ink-secondary">Cresceram em receitas</p>
              <p className="text-sm text-ink-primary">
                {summary.categoryHighlights.incomeGrowthCategoryIds.length > 0
                  ? summary.categoryHighlights.incomeGrowthCategoryIds
                      .map((id) => categoriesById.get(id)?.name ?? '—')
                      .join(', ')
                  : 'Nenhuma'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-ink-primary">
          Categorias em percentual do mês
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CategoryPieChart
            title="Despesas por categoria"
            emptyMessage="Nenhuma despesa neste mês ainda."
            data={summary.categoryBreakdown
              .filter((row) => row.expenseTotalCents > 0)
              .map((row) => ({
                label: categoriesById.get(row.categoryId)?.name ?? '—',
                valueCents: row.expenseTotalCents,
              }))}
          />
          <CategoryPieChart
            title="Receitas por categoria"
            emptyMessage="Nenhuma receita neste mês ainda."
            data={summary.categoryBreakdown
              .filter((row) => row.incomeTotalCents > 0)
              .map((row) => ({
                label: categoriesById.get(row.categoryId)?.name ?? '—',
                valueCents: row.incomeTotalCents,
              }))}
          />
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-ink-secondary/25 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
          <Lightbulb className="h-4 w-4 text-financial-warning" aria-hidden="true" />
          Insights
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          O motor de insights chega em um estágio futuro (Insight Engine). Por enquanto, acompanhe o
          resumo acima.
        </p>
      </section>
    </div>
  );
}
