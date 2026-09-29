'use client';

import type { FinancialTransactionStatus, FinancialTransactionType } from '@prisma/client';
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatMonthLabel, shiftMonthParam } from '@/shared/period';
import { Badge, Checkbox, FinancialValue, Select } from '@/shared/ui';
import {
  computeSimulationSummary,
  filterSimulationTransactions,
  type SimulationFilters,
  type SimulationSummary,
} from './simulation-calculations';

export interface SimulationTransactionView {
  id: string;
  type: FinancialTransactionType;
  status: FinancialTransactionStatus;
  amountCents: number;
  dueDate: string | Date;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string;
}

interface SimpleOption {
  id: string;
  name: string;
}

interface SimulationViewProps {
  transactions: SimulationTransactionView[];
  accounts: SimpleOption[];
  categories: SimpleOption[];
  period: { from: string };
}

const STATUS_LABEL: Record<FinancialTransactionStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

const STATUS_TONE: Record<FinancialTransactionStatus, 'warning' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  PAID: 'success',
  RECEIVED: 'success',
  CANCELLED: 'neutral',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

/**
 * Conteúdo do painel de previsão (Seção — Simulação, evolução v1.8),
 * reaproveitado em dois lugares: o painel fixo lateral do desktop e a
 * folha que abre por cima da barra fixa do mobile. Mesmos cálculos, dois
 * lugares diferentes na tela — nunca duplica lógica, só apresentação.
 */
function SummaryPanelContent({
  summary,
  selectedCount,
  rowsById,
  onToggleRow,
  onClearSelection,
}: {
  summary: SimulationSummary;
  selectedCount: number;
  rowsById: Map<string, SimulationTransactionView>;
  onToggleRow: (id: string) => void;
  onClearSelection: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2">
        <div className="bg-financial-success/10 flex items-center justify-between rounded-md px-3 py-2.5">
          <span className="text-xs font-semibold text-financial-successText">
            A receber (selecionado)
          </span>
          <FinancialValue cents={summary.incomeSumCents} />
        </div>
        <div className="bg-financial-danger/10 flex items-center justify-between rounded-md px-3 py-2.5">
          <span className="text-xs font-semibold text-financial-dangerText">
            A pagar (selecionado)
          </span>
          <FinancialValue cents={summary.expenseSumCents} />
        </div>
        <div className="flex items-center justify-between rounded-md bg-brand-deep px-3 py-2.5">
          <span className="text-xs font-semibold text-white">Resultado líquido</span>
          <FinancialValue cents={summary.netCents} showSign className="text-white" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
          Itens selecionados ({selectedCount})
        </span>
        {selectedCount > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs font-semibold text-brand-flow"
          >
            Limpar
          </button>
        ) : null}
      </div>

      {selectedCount > 0 ? (
        <div className="flex max-h-80 flex-col overflow-y-auto">
          {summary.items.map((item) => {
            const view = rowsById.get(item.id);
            if (!view) return null;
            return (
              <div
                key={item.id}
                className="border-ink-secondary/10 flex items-center justify-between gap-2 border-b py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-grow">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {view.description}
                  </p>
                  <p className="truncate text-[11px] text-ink-secondary">
                    {view.categoryName ?? 'Sem categoria'} · Acumulado:{' '}
                    <FinancialValue cents={item.runningNetCents} showSign />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleRow(item.id)}
                  aria-label={`Remover ${view.description} da seleção`}
                  className="shrink-0 text-financial-dangerText hover:opacity-70"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="border-ink-secondary/20 rounded-md border border-dashed px-3 py-6 text-center text-xs text-ink-secondary">
          Selecione lançamentos na lista para simular quanto pagaria ou receberia somando eles.
        </p>
      )}
    </div>
  );
}

/**
 * Simulação (evolução v1.8, pedido do cliente) — UX: filtros de Tipo,
 * Categoria, Conta e Status (sempre abrindo em "Todos"), lista com
 * checkbox por linha, e um painel que soma o que for marcado — mostrando o
 * acumulado crescendo a cada seleção ("essa aqui é 100, +100, 200...").
 * Tela 100% de consulta: nenhum handler aqui grava nada no banco, nenhum
 * botão de editar/cancelar/excluir. Pra ajustar um valor, o usuário sai
 * pra Transações, edita lá, e volta — igual o cliente pediu.
 *
 * Responsivo (evolução v1.8.3, pedido do cliente — mobile tinha quebrado):
 * abaixo de `md`, a lista vira cartões empilhados em vez da grade de 6
 * colunas (que só cabe em tela larga), e o painel de previsão sai do lado
 * fixo e vira uma barra fixa no rodapé com o resultado líquido sempre
 * visível — toca nela pra abrir/fechar o detalhe completo por cima. Nada
 * do cálculo muda entre os dois modos, só onde ele aparece.
 */
export function SimulationView({
  transactions,
  accounts,
  categories,
  period,
}: SimulationViewProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SimulationFilters>({
    type: 'ALL',
    categoryId: 'ALL',
    accountId: 'ALL',
    status: 'ALL',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const simulationTransactions = useMemo(
    () =>
      transactions.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        amountCents: t.amountCents,
        categoryId: t.categoryId,
        accountId: t.accountId,
      })),
    [transactions],
  );

  const filteredRows = useMemo(
    () => filterSimulationTransactions(simulationTransactions, filters),
    [simulationTransactions, filters],
  );
  const rowsById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);

  const summary = useMemo(
    () => computeSimulationSummary(simulationTransactions, selectedIds),
    [simulationTransactions, selectedIds],
  );

  function toggleRow(id: string): void {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function clearSelection(): void {
    setSelectedIds([]);
  }

  function navigateMonth(direction: 1 | -1): void {
    const monthValue = shiftMonthParam(period.from, direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', monthValue);
    router.push(`/app/simulacao?${params.toString()}`);
    // Trocar de mês muda o universo de lançamentos (o item selecionado pode
    // nem existir mais na tela) — mesma decisão do cliente pra Categoria/
    // Conta/Status: aqui o "escopo" muda de verdade, então a seleção some.
    setSelectedIds([]);
  }

  const monthLabel = formatMonthLabel(new Date(period.from));

  const typeOptions = [
    { value: 'ALL', label: 'Todas' },
    { value: 'INCOME', label: 'Somente receitas' },
    { value: 'EXPENSE', label: 'Somente despesas' },
  ];
  const categoryOptions = [
    { value: 'ALL', label: 'Todas' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
  const accountOptions = [
    { value: 'ALL', label: 'Todas' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];
  const statusOptions = [
    { value: 'ALL', label: 'Todos' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'PAID', label: 'Paga' },
    { value: 'RECEIVED', label: 'Recebida' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];

  return (
    // pb-24 no mobile: espaço pra barra fixa do painel nunca cobrir o
    // último item da lista; some em md+ porque lá o painel não é fixo.
    <div className="flex flex-col gap-5 pb-24 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Simulação</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Consulte e some lançamentos do período pra ver quanto representam juntos. Não edita nem
            registra nada — pra mudar um valor, ajuste em Transações.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            aria-label="Mês anterior"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold text-ink-primary">
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

      <div className="border-ink-secondary/15 grid grid-cols-2 gap-3 rounded-lg border bg-surface-card p-4 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
        <div className="sm:w-44">
          <Select
            label="Receitas / Despesas"
            options={typeOptions}
            value={filters.type}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value as SimulationFilters['type'] }))
            }
          />
        </div>
        <div className="sm:w-52">
          <Select
            label="Categoria"
            options={categoryOptions}
            value={filters.categoryId}
            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
          />
        </div>
        <div className="sm:w-52">
          <Select
            label="Conta"
            options={accountOptions}
            value={filters.accountId}
            onChange={(e) => setFilters((f) => ({ ...f, accountId: e.target.value }))}
          />
        </div>
        <div className="sm:w-40">
          <Select
            label="Status"
            options={statusOptions}
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value as SimulationFilters['status'] }))
            }
          />
        </div>
        <span className="col-span-2 text-xs text-ink-secondary sm:col-span-1 sm:ml-auto sm:pb-2.5">
          {filteredRows.length} {filteredRows.length === 1 ? 'lançamento' : 'lançamentos'}
        </span>
      </div>

      <div className="flex flex-col items-start gap-5 md:flex-row">
        <div className="border-ink-secondary/15 w-full overflow-hidden rounded-lg border bg-surface-card md:flex-grow">
          {/* Cabeçalho de coluna — só faz sentido na grade do desktop. */}
          <div className="border-ink-secondary/10 hidden grid-cols-[44px_100px_1fr_110px_120px_130px] gap-0 border-b bg-surface-page px-4 py-2.5 md:grid">
            <span />
            <span className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
              Data
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
              Descrição
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
              Tipo
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-ink-secondary">
              Status
            </span>
            <span className="text-right text-xs font-bold uppercase tracking-wide text-ink-secondary">
              Valor
            </span>
          </div>

          {filteredRows.map((row) => {
            const view = rowsById.get(row.id);
            if (!view) return null;
            const isIncome = view.type === 'INCOME';
            const isCancelled = view.status === 'CANCELLED';
            const checked = selectedIds.includes(row.id);
            return (
              <div key={row.id} className="border-ink-secondary/10 border-b last:border-b-0">
                {/* Cartão empilhado — abaixo de md. */}
                <div className="flex flex-col gap-2 px-4 py-3 hover:bg-surface-page md:hidden">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      label={`Selecionar ${view.description}`}
                      hideLabel
                      checked={checked}
                      onChange={() => toggleRow(row.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-grow">
                      <p className="truncate text-sm font-medium text-ink-primary">
                        {view.description}
                      </p>
                      <p className="truncate text-xs text-ink-secondary">
                        {view.categoryName ?? 'Sem categoria'}
                      </p>
                    </div>
                    <FinancialValue
                      cents={isIncome ? view.amountCents : -view.amountCents}
                      showSign
                      tone={isCancelled ? 'neutral' : undefined}
                      className="shrink-0 text-right"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-8">
                    <span className="text-xs text-ink-secondary">
                      {dateFormatter.format(new Date(view.dueDate))}
                    </span>
                    <Badge tone={isIncome ? 'success' : 'danger'}>
                      {isIncome ? 'Receita' : 'Despesa'}
                    </Badge>
                    <Badge tone={STATUS_TONE[view.status]}>{STATUS_LABEL[view.status]}</Badge>
                  </div>
                </div>

                {/* Linha de grade — md e acima. */}
                <div className="hidden grid-cols-[44px_100px_1fr_110px_120px_130px] items-center gap-0 px-4 py-3 hover:bg-surface-page md:grid">
                  <Checkbox
                    label={`Selecionar ${view.description}`}
                    hideLabel
                    checked={checked}
                    onChange={() => toggleRow(row.id)}
                  />
                  <span className="text-sm text-ink-primary">
                    {dateFormatter.format(new Date(view.dueDate))}
                  </span>
                  <span className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {view.description}
                    </p>
                    <p className="truncate text-xs text-ink-secondary">
                      {view.categoryName ?? 'Sem categoria'}
                    </p>
                  </span>
                  <span>
                    <Badge tone={isIncome ? 'success' : 'danger'}>
                      {isIncome ? 'Receita' : 'Despesa'}
                    </Badge>
                  </span>
                  <span>
                    <Badge tone={STATUS_TONE[view.status]}>{STATUS_LABEL[view.status]}</Badge>
                  </span>
                  <FinancialValue
                    cents={isIncome ? view.amountCents : -view.amountCents}
                    showSign
                    tone={isCancelled ? 'neutral' : undefined}
                    className="text-right"
                  />
                </div>
              </div>
            );
          })}

          {filteredRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-secondary">
              Nenhum lançamento encontrado com esses filtros.
            </div>
          ) : null}
        </div>

        {/* Painel de previsão — fixo do lado, só em md+. */}
        <div className="border-ink-secondary/15 sticky top-4 hidden w-80 shrink-0 flex-col gap-3.5 rounded-lg border bg-surface-card p-4 md:flex">
          <div>
            <h2 className="text-sm font-bold text-brand-deep">Painel de previsão</h2>
            <p className="text-xs text-ink-secondary">Some os lançamentos que quiser simular.</p>
          </div>
          <SummaryPanelContent
            summary={summary}
            selectedCount={selectedIds.length}
            rowsById={rowsById}
            onToggleRow={toggleRow}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {/* Painel de previsão — barra fixa no rodapé, só abaixo de md. */}
      <div className="border-ink-secondary/15 fixed inset-x-0 bottom-0 z-40 border-t bg-surface-card md:hidden">
        {mobilePanelOpen ? (
          <div className="border-ink-secondary/15 max-h-[60vh] overflow-y-auto border-b p-4">
            <SummaryPanelContent
              summary={summary}
              selectedCount={selectedIds.length}
              rowsById={rowsById}
              onToggleRow={toggleRow}
              onClearSelection={clearSelection}
            />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMobilePanelOpen((open) => !open)}
          aria-expanded={mobilePanelOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <span className="flex flex-col items-start">
            <span className="text-xs font-semibold text-ink-secondary">
              Resultado líquido ({selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'})
            </span>
            <FinancialValue cents={summary.netCents} showSign />
          </span>
          <ChevronDown
            className={[
              'h-5 w-5 text-ink-secondary transition-transform',
              mobilePanelOpen ? 'rotate-180' : '',
            ].join(' ')}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
