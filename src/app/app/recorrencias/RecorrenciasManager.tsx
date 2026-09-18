'use client';

import { ArrowLeftRight, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button } from '@/shared/ui';
import { DeleteSeriesModal } from '@/shared/recurrence/DeleteSeriesModal';
import type { SeriesActionMode } from '@/shared/recurrence/DeleteSeriesModal';
import { EditRecurrenceSeriesModal } from './EditRecurrenceSeriesModal';

interface SimpleOption {
  id: string;
  name: string;
}

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
  baseAmountCents: number;
  defaultAccountId: string | null;
  defaultCategoryId: string | null;
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
 * (transação e transferência), permite selecionar várias e excluir em
 * massa, e editar cada série de transação individualmente (evolução
 * v1.3 — edição de transferência recorrente fica de fora por enquanto: o
 * motor de alterar nunca lidou com origem/destino de transferência).
 * Excluir e editar sempre com escolha de modo — tudo ou do mês seguinte
 * em diante.
 */
export function RecorrenciasManager({
  series,
  accounts,
  categories,
}: {
  series: SeriesView[];
  accounts: SimpleOption[];
  categories: SimpleOption[];
}): React.ReactElement {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);

  const allSelected = series.length > 0 && selected.size === series.length;
  const editingSeries = series.find((s) => s.id === editingSeriesId) ?? null;

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

  async function handleConfirmDelete(mode: SeriesActionMode): Promise<void> {
    for (const seriesId of selected) {
      const response = await fetch(`/api/recurrencias/${seriesId}?mode=${mode}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? 'Não foi possível excluir uma das séries selecionadas.');
      }
    }
    setSelected(new Set());
    setDeleteModalOpen(false);
    router.refresh();
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-secondary/15 bg-surface-card p-3">
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
          onClick={() => setDeleteModalOpen(true)}
          disabled={selected.size === 0}
        >
          Excluir selecionadas ({selected.size})
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-surface-card">
        {series.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-page">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggleOne(item.id)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-ink-secondary/40"
              aria-label={`Selecionar ${item.description ?? 'série'}`}
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
            {item.kind === 'TRANSACTION' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditingSeriesId(item.id)}
                className="shrink-0"
              >
                Editar
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <DeleteSeriesModal
        open={deleteModalOpen}
        seriesCount={selected.size}
        settledLabel="pago/recebido"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />

      {editingSeries ? (
        <EditRecurrenceSeriesModal
          seriesId={editingSeries.id}
          seriesDescription={editingSeries.description}
          initialAmountCents={editingSeries.baseAmountCents}
          initialAccountId={editingSeries.defaultAccountId}
          initialCategoryId={editingSeries.defaultCategoryId}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditingSeriesId(null)}
        />
      ) : null}
    </div>
  );
}
