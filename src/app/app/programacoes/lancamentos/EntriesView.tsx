'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatMonthLabel, shiftMonthParam } from '@/shared/period';
import { Badge, Button, FinancialValue } from '@/shared/ui';
import { groupEntriesByBeneficiary } from './entry-grouping';
import type { EntryView } from './entry-grouping';
import { EntryDetailDrawer } from './EntryDetailDrawer';
import { EntryFormDrawer } from './EntryFormDrawer';
import { GenerateTransactionModal } from './GenerateTransactionModal';

interface SimpleOption {
  id: string;
  name: string;
}

interface EntriesViewProps {
  entries: EntryView[];
  origins: SimpleOption[];
  beneficiaries: SimpleOption[];
  accounts: SimpleOption[];
  period: { from: string; to: string };
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

interface GenerateTarget {
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'INCOME' | 'EXPENSE';
  totalAmountCents: number;
  eligibleCount: number;
}

/**
 * Lançamentos de Programações (Seções 12-16, 34-40) — tela operacional
 * principal do módulo. Visual reconhecível de Transações (navegação
 * mensal idêntica), mas agrupado por BENEFICIÁRIO em vez de data (Seção
 * 34), com Receitas e Despesas sempre separadas dentro de cada grupo
 * (Seção 35).
 */
export function EntriesView({
  entries,
  origins,
  beneficiaries,
  accounts,
  period,
}: EntriesViewProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creatingType, setCreatingType] = useState<'INCOME' | 'EXPENSE' | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [generateTarget, setGenerateTarget] = useState<GenerateTarget | null>(null);

  const groups = useMemo(() => groupEntriesByBeneficiary(entries), [entries]);
  const monthLabel = formatMonthLabel(new Date(period.from));
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? null;

  function navigateMonth(direction: 1 | -1): void {
    const monthValue = shiftMonthParam(period.from, direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', monthValue);
    router.push(`/app/programacoes/lancamentos?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-primary">Programações — Lançamentos</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCreatingType('INCOME')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nova receita
          </Button>
          <Button variant="secondary" onClick={() => setCreatingType('EXPENSE')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nova despesa
          </Button>
        </div>
      </div>

      <p className="rounded-md bg-surface-page px-3 py-2 text-xs text-ink-secondary">
        Programações são um controle auxiliar — nunca afetam seu saldo, suas contas ou seus
        relatórios financeiros até você clicar em &quot;Gerar transação&quot; em algum grupo abaixo.
      </p>

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

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div
            key={group.beneficiaryId}
            className="rounded-lg border border-ink-secondary/15 bg-white"
          >
            <div className="border-b border-ink-secondary/10 px-4 py-2.5">
              <span className="text-sm font-semibold text-ink-primary">
                {group.beneficiaryName}
              </span>
            </div>

            {group.incomeEntries.length > 0 ? (
              <EntryTypeSection
                title="Receitas"
                entries={group.incomeEntries}
                totalCents={group.incomeTotalCents}
                eligibleCount={group.incomeEligibleCount}
                onSelectEntry={setSelectedEntryId}
                onGenerate={() =>
                  setGenerateTarget({
                    beneficiaryId: group.beneficiaryId,
                    beneficiaryName: group.beneficiaryName,
                    type: 'INCOME',
                    totalAmountCents: group.incomeTotalCents,
                    eligibleCount: group.incomeEligibleCount,
                  })
                }
              />
            ) : null}

            {group.expenseEntries.length > 0 ? (
              <EntryTypeSection
                title="Despesas"
                entries={group.expenseEntries}
                totalCents={group.expenseTotalCents}
                eligibleCount={group.expenseEligibleCount}
                onSelectEntry={setSelectedEntryId}
                onGenerate={() =>
                  setGenerateTarget({
                    beneficiaryId: group.beneficiaryId,
                    beneficiaryName: group.beneficiaryName,
                    type: 'EXPENSE',
                    totalAmountCents: group.expenseTotalCents,
                    eligibleCount: group.expenseEligibleCount,
                  })
                }
              />
            ) : null}
          </div>
        ))}
        {groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-secondary/25 py-16 text-center text-sm text-ink-secondary">
            Nenhum lançamento de Programação neste período.
          </div>
        ) : null}
      </div>

      {creatingType ? (
        <EntryFormDrawer
          type={creatingType}
          origins={origins}
          beneficiaries={beneficiaries}
          defaultDate={period.from}
          onClose={() => setCreatingType(null)}
        />
      ) : null}

      {selectedEntry ? (
        <EntryDetailDrawer
          entry={selectedEntry}
          origins={origins}
          beneficiaries={beneficiaries}
          onClose={() => setSelectedEntryId(null)}
        />
      ) : null}

      {generateTarget ? (
        <GenerateTransactionModal
          beneficiaryId={generateTarget.beneficiaryId}
          beneficiaryName={generateTarget.beneficiaryName}
          type={generateTarget.type}
          totalAmountCents={generateTarget.totalAmountCents}
          eligibleCount={generateTarget.eligibleCount}
          periodFrom={period.from}
          periodTo={period.to}
          accounts={accounts}
          onClose={() => setGenerateTarget(null)}
        />
      ) : null}
    </div>
  );
}

interface EntryTypeSectionProps {
  title: string;
  entries: EntryView[];
  totalCents: number;
  eligibleCount: number;
  onSelectEntry: (id: string) => void;
  onGenerate: () => void;
}

function EntryTypeSection({
  title,
  entries,
  totalCents,
  eligibleCount,
  onSelectEntry,
  onGenerate,
}: EntryTypeSectionProps): React.ReactElement {
  return (
    <div className="border-b border-ink-secondary/10 px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          {title}
        </span>
        <FinancialValue cents={totalCents} className="text-sm" />
      </div>

      <div className="flex flex-col divide-y divide-ink-secondary/10">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelectEntry(entry.id)}
            className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-surface-page"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-ink-primary">{entry.description}</span>
              {entry.seriesPosition ? (
                <Badge tone="neutral">
                  {entry.seriesPosition.current}
                  {entry.seriesPosition.total ? `/${entry.seriesPosition.total}` : ''}
                </Badge>
              ) : null}
              {entry.status === 'CANCELLED' ? <Badge tone="neutral">Cancelado</Badge> : null}
              {entry.convertedAt ? <Badge tone="success">Gerado</Badge> : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-ink-secondary">
                {dateFormatter.format(new Date(entry.entryDate))}
              </span>
              <FinancialValue cents={entry.amountCents} className="text-sm" />
            </div>
          </button>
        ))}
      </div>

      {eligibleCount > 0 ? (
        <Button size="sm" variant="secondary" onClick={onGenerate} className="mt-3">
          Gerar transação ({eligibleCount})
        </Button>
      ) : null}
    </div>
  );
}
