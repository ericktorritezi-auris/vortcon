'use client';

import { Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button } from '@/shared/ui';
import { DeleteSeriesModal } from '@/shared/recurrence/DeleteSeriesModal';
import type { SeriesActionMode } from '@/shared/recurrence/DeleteSeriesModal';
import { EditProgrammingSeriesModal } from './EditProgrammingSeriesModal';

interface SimpleOption {
  id: string;
  name: string;
}

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
  baseAmountCents: number;
  defaultOriginId: string | null;
  defaultBeneficiaryId: string;
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
 * Gestão de séries de Programações (Seções 19-22, 32, evolução v1.3) —
 * mesma mecânica de seleção múltipla + exclusão em massa da gestão
 * financeira, agora com edição também, sempre com escolha de modo (tudo
 * ou do mês seguinte em diante). Diferença crítica na trava (Seção 32):
 * ocorrências já convertidas em Transação são SEMPRE preservadas, nunca
 * excluídas/reescritas — a trava aqui é "convertida", nunca
 * "pago/recebido" (que não existe neste domínio).
 */
export function ProgrammingRecurrenceManager({
  series,
  origins,
  beneficiaries,
}: {
  series: SeriesView[];
  origins: SimpleOption[];
  beneficiaries: SimpleOption[];
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
      const response = await fetch(`/api/programacoes/recorrencias/${seriesId}?mode=${mode}`, {
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
      <p className="border-ink-secondary/25 rounded-lg border border-dashed p-6 text-center text-sm text-ink-secondary">
        Nenhuma recorrência de Programação criada ainda. Ative &quot;Receita recorrente&quot; ou
        &quot;Despesa recorrente&quot; ao criar um lançamento em Programações &gt; Lançamentos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-ink-secondary/15 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface-card p-3">
        <label className="flex items-center gap-2 text-sm text-ink-primary">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="border-ink-secondary/40 h-4 w-4 rounded"
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

      <div className="divide-ink-secondary/10 border-ink-secondary/15 flex flex-col divide-y rounded-lg border bg-surface-card">
        {series.map((item) => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-page">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggleOne(item.id)}
              className="border-ink-secondary/40 mt-1 h-4 w-4 shrink-0 rounded"
              aria-label={`Selecionar ${item.description}`}
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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditingSeriesId(item.id)}
              className="shrink-0"
            >
              Editar
            </Button>
          </div>
        ))}
      </div>

      <DeleteSeriesModal
        open={deleteModalOpen}
        seriesCount={selected.size}
        settledLabel="convertido em transação"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModalOpen(false)}
      />

      {editingSeries ? (
        <EditProgrammingSeriesModal
          seriesId={editingSeries.id}
          seriesDescription={editingSeries.description}
          initialAmountCents={editingSeries.baseAmountCents}
          initialOriginId={editingSeries.defaultOriginId}
          initialBeneficiaryId={editingSeries.defaultBeneficiaryId}
          origins={origins}
          beneficiaries={beneficiaries}
          onClose={() => setEditingSeriesId(null)}
        />
      ) : null}
    </div>
  );
}
