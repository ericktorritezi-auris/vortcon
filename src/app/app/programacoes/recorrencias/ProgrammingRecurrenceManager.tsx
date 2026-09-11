'use client';

import { AlertTriangle, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button } from '@/shared/ui';

interface SeriesView {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';
  interval: number;
  startDate: string | Date;
  endDate: string | Date | null;
  active: boolean;
  occurrenceCount: number;
  beneficiaryName: string;
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
 * Gestão de séries de Programações (Seções 19-22, 32) — mesma mecânica
 * de seleção múltipla + exclusão em massa da gestão financeira, com uma
 * diferença crítica (Seção 32): ocorrências já convertidas em Transação
 * são SEMPRE preservadas, nunca excluídas — só as ainda não convertidas
 * somem junto com a série. A confirmação deixa isso explícito antes de
 * agir.
 */
export function ProgrammingRecurrenceManager({
  series,
}: {
  series: SeriesView[];
}): React.ReactElement {
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
      `Excluir ${selected.size} série(s) de Programação? Até ${totalOccurrences} lançamento(s) ainda não convertido(s) em transação serão excluídos — mas qualquer ocorrência que já tenha gerado uma transação financeira é preservada, nunca excluída. Essa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      for (const seriesId of selected) {
        const response = await fetch(`/api/programacoes/recorrencias/${seriesId}`, {
          method: 'DELETE',
        });
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
        Nenhuma recorrência de Programação criada ainda. Ative &quot;Receita recorrente&quot; ou
        &quot;Despesa recorrente&quot; ao criar um lançamento em Programações &gt; Lançamentos.
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
              <Repeat className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-ink-primary">{item.description}</span>
                <Badge tone={item.type === 'INCOME' ? 'success' : 'danger'}>
                  {item.type === 'INCOME' ? 'Receita' : 'Despesa'}
                </Badge>
                {!item.active ? <Badge tone="neutral">Encerrada</Badge> : null}
              </span>
              <span className="block text-xs text-ink-secondary">
                {FREQUENCY_LABEL[item.frequency]} · {item.beneficiaryName} · começou em{' '}
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
