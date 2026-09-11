'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Drawer, FinancialValue } from '@/shared/ui';
import { EntryFormFields } from './EntryFormFields';
import type { EntryFormValues } from './EntryFormFields';
import type { EntryView } from './entry-grouping';

interface SimpleOption {
  id: string;
  name: string;
}

interface EntryDetailDrawerProps {
  entry: EntryView;
  origins: SimpleOption[];
  beneficiaries: SimpleOption[];
  onClose: () => void;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

function toDateInputValue(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

/**
 * Detalhe do lançamento (Seções 24-31, 44-45). Uma ocorrência já
 * convertida (Seção 44) nunca pode ser editada, reativada ou excluída —
 * só cancelada (Seção 45), e a Transação gerada nunca é tocada por isso.
 */
export function EntryDetailDrawer({
  entry,
  origins,
  beneficiaries,
  onClose,
}: EntryDetailDrawerProps): React.ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<EntryFormValues>({
    originId: null,
    beneficiaryId: entry.beneficiaryId,
    description: entry.description,
    amountCents: entry.amountCents,
    entryDate: toDateInputValue(entry.entryDate),
  });

  const isConverted = Boolean(entry.convertedAt);
  const isCancelled = entry.status === 'CANCELLED';

  async function runAction(action: () => Promise<Response>): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const response = await action();
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível concluir a ação.');
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Não foi possível concluir a ação agora.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(): Promise<void> {
    await runAction(() =>
      fetch(`/api/programacoes/lancamentos/${entry.id}/cancelar`, { method: 'POST' }),
    );
  }

  async function handleReactivate(): Promise<void> {
    await runAction(() =>
      fetch(`/api/programacoes/lancamentos/${entry.id}/reativar`, { method: 'POST' }),
    );
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm('Excluir este lançamento de vez? Essa ação não pode ser desfeita.')) return;
    await runAction(() => fetch(`/api/programacoes/lancamentos/${entry.id}`, { method: 'DELETE' }));
  }

  async function handleSaveEdit(): Promise<void> {
    await runAction(() =>
      fetch(`/api/programacoes/lancamentos/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originId: values.originId,
          beneficiaryId: values.beneficiaryId,
          description: values.description,
          amountCents: values.amountCents,
          entryDate: values.entryDate,
        }),
      }),
    );
  }

  if (editing) {
    return (
      <Drawer
        open
        onClose={onClose}
        title="Editar lançamento"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">
              Voltar
            </Button>
            <Button onClick={handleSaveEdit} loading={loading} className="flex-1">
              Salvar
            </Button>
          </div>
        }
      >
        <EntryFormFields
          values={values}
          onChange={setValues}
          origins={origins}
          beneficiaries={beneficiaries}
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-financial-danger">
            {error}
          </p>
        ) : null}
      </Drawer>
    );
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Detalhe do lançamento"
      footer={
        isConverted ? (
          !isCancelled ? (
            <Button variant="danger" onClick={handleCancel} loading={loading} className="w-full">
              Cancelar
            </Button>
          ) : null
        ) : (
          <div className="flex flex-wrap gap-2">
            {!isCancelled ? (
              <>
                <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancel}
                  loading={loading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={handleReactivate}
                  loading={loading}
                  className="flex-1"
                >
                  Reativar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  loading={loading}
                  className="flex-1"
                >
                  Excluir
                </Button>
              </>
            )}
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge tone={entry.type === 'INCOME' ? 'success' : 'danger'}>
            {entry.type === 'INCOME' ? 'Receita' : 'Despesa'}
          </Badge>
          {isCancelled ? <Badge tone="neutral">Cancelado</Badge> : null}
          {isConverted ? <Badge tone="success">Transação gerada</Badge> : null}
          {entry.seriesPosition ? (
            <Badge tone="neutral">
              {entry.seriesPosition.current}
              {entry.seriesPosition.total ? `/${entry.seriesPosition.total}` : ''}
            </Badge>
          ) : null}
        </div>

        <FinancialValue cents={entry.amountCents} className="text-2xl" />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-secondary">Beneficiário</dt>
            <dd className="text-ink-primary">{entry.beneficiaryName}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Data</dt>
            <dd className="text-ink-primary">{dateFormatter.format(new Date(entry.entryDate))}</dd>
          </div>
          {entry.originName ? (
            <div>
              <dt className="text-ink-secondary">Origem</dt>
              <dd className="text-ink-primary">{entry.originName}</dd>
            </div>
          ) : null}
        </dl>

        <div>
          <p className="text-xs font-medium text-ink-secondary">Descrição</p>
          <p className="text-sm text-ink-primary">{entry.description}</p>
        </div>

        {isConverted ? (
          <p className="rounded-md bg-surface-page px-3 py-2 text-xs text-ink-secondary">
            Este lançamento já gerou uma transação financeira — a rastreabilidade precisa ser
            preservada, por isso não pode mais ser editado, reativado ou excluído (só cancelado).
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-financial-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}
