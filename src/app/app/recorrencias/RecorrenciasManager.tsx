'use client';

import { AlertTriangle, ArrowLeftRight, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button } from '@/shared/ui';

interface SeriesView {
  id: string;
  kind: 'TRANSACTION' | 'TRANSFER';
  transactionType: 'INCOME' | 'EXPENSE' | null;
  description: string | null;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';
  interval: number;
  startDate: string | Date;
  endDate: string | Date | null;
  active: boolean;
  occurrenceCount: number;
  accountName: string | null;
}

const FREQUENCY_LABEL: Record<SeriesView['frequency'], string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
  CUSTOM_DAYS: 'Personalizada',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

/**
 * Gestão de recorrências (pedido do cliente) — lista todas as séries
 * (transação e transferência), permite selecionar várias e excluir tudo
 * de uma vez, com a série inteira e todas as ocorrências, de qualquer
 * status. Ação destrutiva e irreversível — confirmação obrigatória antes
 * de qualquer exclusão.
 */
export function RecorrenciasManager({ series }: { series: SeriesView[] }): React.ReactElement {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allSelected = series.length > 0 && selected.size === series.length;

  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setSelected(allSelected ? new Set() : new Set(series.map((s) => s.id)));
  }

  async function handleDeleteSelected(): Promise<void> {
    if (selected.size === 0) return;

    const totalOccurrences = series
      .filter((s) => selected.has(s.id))
      .reduce((sum, s) => sum + s.occurrenceCount, 0);

    const confirmed = window.confirm(
      `Excluir ${selected.size} série(s) recorrente(s) e TODOS os ${totalOccurrences} lançamentos que elas já geraram — pagos, pendentes, cancelados, todos? Essa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      for (const seriesId of selected) {
        const response = await fetch(`/api/recurrencias/${seriesId}`, { method: 'DELETE' });
        if (!response.ok) {
          const body = (await response.json()) as { message?: string };
          setError(body.message ?? 'Não foi possível excluir uma das séries selecionadas.');
          return;
        }
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (series.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-secondary/25 p-6 text-center text-sm text-ink-secondary">
        Nenhuma recorrência criada ainda. Ative &quot;Receita/despesa recorrente&quot; ou
        &quot;Transferência recorrente&quot; ao criar um lançamento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-secondary/15 bg-white p-3">
        <label className="flex items-center gap-2 text-sm text-ink-primary">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-ink-secondary/40"
          />
          Selecionar todas ({series.length})
        </label>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDeleteSelected}
          loading={loading}
          disabled={selected.size === 0}
        >
          Excluir selecionadas ({selected.size})
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm font-medium text-financial-danger"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
        {series.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-surface-page"
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggleOne(item.id)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-ink-secondary/40"
            />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
              {item.kind === 'TRANSFER' ? (
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Repeat className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-ink-primary">
                  {item.description ??
                    (item.kind === 'TRANSFER'
                      ? 'Transferência recorrente'
                      : item.transactionType === 'INCOME'
                        ? 'Receita recorrente'
                        : 'Despesa recorrente')}
                </span>
                {!item.active ? <Badge tone="neutral">Encerrada</Badge> : null}
              </span>
              <span className="block text-xs text-ink-secondary">
                {FREQUENCY_LABEL[item.frequency]}
                {item.accountName ? ` · ${item.accountName}` : ''} · começou em{' '}
                {dateFormatter.format(new Date(item.startDate))}
                {item.endDate
                  ? ` · termina em ${dateFormatter.format(new Date(item.endDate))}`
                  : ''}{' '}
                · {item.occurrenceCount} lançamento(s) gerado(s)
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
