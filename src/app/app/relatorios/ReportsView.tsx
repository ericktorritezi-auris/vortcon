'use client';

import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMonthLabel, shiftMonthParam } from '@/shared/period';
import { Badge, Button, FinancialValue, Select } from '@/shared/ui';
import type { ReportFilterSummary, ReportResult } from '@/modules/reports/report.service';

interface SimpleOption {
  id: string;
  name: string;
}

interface ReportsViewProps {
  result: ReportResult;
  filterSummary: ReportFilterSummary;
  categories: SimpleOption[];
  accounts: SimpleOption[];
  tags: SimpleOption[];
  period: { from: string; to: string };
  selected: {
    categoria?: string;
    conta?: string;
    tag?: string;
    status?: string;
    natureza?: string;
  };
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

/**
 * Relatórios (Seção 94-101). Filtros completos, sempre dividido por mês
 * (Seção 94, pedido explícito do cliente). Exportação (PDF/Excel) só
 * aparece em telas sm+ — mobile é só visualização (Seção 99).
 */
export function ReportsView({
  result,
  categories,
  accounts,
  tags,
  period,
  selected,
}: ReportsViewProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthLabel = formatMonthLabel(new Date(period.from));

  function updateParam(key: string, value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '') params.delete(key);
    else params.set(key, value);
    router.push(`/app/relatorios?${params.toString()}`);
  }

  function navigateMonth(direction: 1 | -1): void {
    const monthValue = shiftMonthParam(period.from, direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', monthValue);
    params.delete('de');
    params.delete('ate');
    router.push(`/app/relatorios?${params.toString()}`);
  }

  const exportQuery = searchParams.toString();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-primary">Relatórios</h1>
        <div className="hidden items-center gap-2 sm:flex">
          <a href={`/api/reports/pdf?${exportQuery}`} target="_blank" rel="noreferrer">
            <Button variant="secondary">
              <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
              PDF
            </Button>
          </a>
          <a href={`/api/reports/excel?${exportQuery}`}>
            <Button variant="secondary">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Excel
            </Button>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-1 self-start">
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

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-ink-secondary/15 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Select
          label="Categoria"
          value={selected.categoria ?? ''}
          onChange={(event) => updateParam('categoria', event.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          label="Conta"
          value={selected.conta ?? ''}
          onChange={(event) => updateParam('conta', event.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        <Select
          label="Tag"
          value={selected.tag ?? ''}
          onChange={(event) => updateParam('tag', event.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...tags.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        <Select
          label="Status"
          value={selected.status ?? ''}
          onChange={(event) => updateParam('status', event.target.value)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'PENDING', label: 'Pendente' },
            { value: 'PAID', label: 'Paga' },
            { value: 'RECEIVED', label: 'Recebida' },
            { value: 'CANCELLED', label: 'Cancelada' },
          ]}
        />
        <Select
          label="Natureza"
          value={selected.natureza ?? ''}
          onChange={(event) => updateParam('natureza', event.target.value)}
          options={[
            { value: '', label: 'Todos os movimentos' },
            { value: 'INCOME', label: 'Somente receitas' },
            { value: 'EXPENSE', label: 'Somente despesas' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <p className="mb-1 text-xs text-ink-secondary">Receitas</p>
          <FinancialValue cents={result.totalIncomeCents} className="text-lg" />
        </div>
        <div className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <p className="mb-1 text-xs text-ink-secondary">Despesas</p>
          <FinancialValue cents={result.totalExpenseCents} className="text-lg" />
        </div>
        <div className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <p className="mb-1 text-xs text-ink-secondary">Resultado</p>
          <FinancialValue cents={result.totalResultCents} showSign className="text-lg" />
        </div>
        <div className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <p className="mb-1 text-xs text-ink-secondary">Saldo geral</p>
          <FinancialValue cents={result.currentRealBalanceCents} className="text-lg" />
        </div>
      </div>

      {result.categorySummary ? (
        <div className="rounded-lg border border-brand-flow/30 bg-brand-flow/5 p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-primary">
            Categoria: {result.categorySummary.categoryName}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div>
              <p className="text-xs text-ink-secondary">Receitas</p>
              <FinancialValue cents={result.categorySummary.incomeCents} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Despesas</p>
              <FinancialValue cents={result.categorySummary.expenseCents} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Resultado líquido</p>
              <FinancialValue
                cents={result.categorySummary.netResultCents}
                showSign
                className="text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Qtd. entradas</p>
              <p className="text-sm font-semibold text-ink-primary">
                {result.categorySummary.incomeCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Qtd. saídas</p>
              <p className="text-sm font-semibold text-ink-primary">
                {result.categorySummary.expenseCount}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {result.months.map((month) => (
          <div key={month.monthKey} className="rounded-lg border border-ink-secondary/15 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-secondary/10 bg-surface-page px-4 py-3">
              <span className="text-sm font-semibold text-ink-primary">{month.monthLabel}</span>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                <span>
                  Receitas <FinancialValue cents={month.incomeCents} className="text-xs" />
                </span>
                <span>
                  Despesas <FinancialValue cents={month.expenseCents} className="text-xs" />
                </span>
                <span>
                  Resultado{' '}
                  <FinancialValue cents={month.resultCents} showSign className="text-xs" />
                </span>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {month.movements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="w-20 shrink-0 text-xs text-ink-secondary">
                      {dateFormatter.format(new Date(movement.dueDate))}
                    </span>
                    <span className="min-w-0 truncate text-ink-primary">
                      {movement.description}
                    </span>
                    {movement.categoryName ? (
                      <span className="hidden shrink-0 text-xs text-ink-secondary sm:inline">
                        · {movement.categoryName}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-[5.5rem] sm:pl-0">
                    <Badge tone={movement.status === 'CANCELLED' ? 'neutral' : 'success'}>
                      {STATUS_LABEL[movement.status] ?? movement.status}
                    </Badge>
                    <FinancialValue
                      cents={
                        movement.type === 'INCOME' ? movement.amountCents : -movement.amountCents
                      }
                      showSign
                      tone={movement.type === 'INCOME' ? 'positive' : 'negative'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {result.months.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-secondary/25 py-16 text-center text-sm text-ink-secondary">
            Nenhuma movimentação encontrada para os filtros selecionados.
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <Download className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
        <p className="text-xs text-ink-secondary">
          Exportar em PDF ou Excel está disponível na versão web.
        </p>
      </div>
    </div>
  );
}
