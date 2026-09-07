'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Drawer, FinancialValue, Toggle } from '@/shared/ui';
import type { TransferItemView } from './TransfersView';

interface SimpleOption {
  id: string;
  name: string;
}

interface TransferDetailDrawerProps {
  transfer: TransferItemView;
  accounts: SimpleOption[];
  onClose: () => void;
}

const STATUS_LABEL: Record<TransferItemView['status'], string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

/**
 * Detalhe da transferência — mesmo padrão pedido pelo cliente para
 * transações: toggle "transferido/não transferido" (Seção 68 estendida),
 * sempre disponível antes de qualquer outra ação, nunca só um botão de mão
 * única.
 */
export function TransferDetailDrawer({
  transfer,
  accounts,
  onClose,
}: TransferDetailDrawerProps): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const isCancelled = transfer.status === 'CANCELLED';
  const isCompleted = transfer.status === 'COMPLETED';

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
      router.refresh();
    } catch {
      setError('Não foi possível concluir a ação agora.');
    } finally {
      setLoading(false);
    }
  }

  function handleToggleCompleted(nextChecked: boolean): void {
    if (nextChecked) {
      void runAction(() => fetch(`/api/transfers/${transfer.id}/settle`, { method: 'POST' }));
    } else {
      void runAction(() => fetch(`/api/transfers/${transfer.id}/unsettle`, { method: 'POST' }));
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Detalhe da transferência"
      footer={
        <Button variant="secondary" onClick={onClose} className="w-full">
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-primary">
          <span>{accountsById.get(transfer.sourceAccountId)?.name ?? '—'}</span>
          <ArrowRight className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          <span>{accountsById.get(transfer.destinationAccountId)?.name ?? '—'}</span>
        </div>

        {!isCancelled ? (
          <div className="flex items-center justify-between rounded-md border border-ink-secondary/15 bg-surface-page px-3 py-2.5">
            <span className="text-sm font-medium text-ink-primary">Transferida</span>
            <Toggle
              label="Marcar como transferida"
              hideLabel
              checked={isCompleted}
              onChange={handleToggleCompleted}
              disabled={loading}
            />
          </div>
        ) : null}

        <FinancialValue cents={transfer.amountCents} className="text-2xl" />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-secondary">Data</dt>
            <dd className="text-ink-primary">
              {dateFormatter.format(new Date(transfer.scheduledDate))}
            </dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Status</dt>
            <dd>
              <Badge tone={isCancelled ? 'neutral' : isCompleted ? 'success' : 'warning'}>
                {STATUS_LABEL[transfer.status]}
              </Badge>
            </dd>
          </div>
        </dl>

        {transfer.note ? (
          <div>
            <p className="text-xs font-medium text-ink-secondary">Observação</p>
            <p className="text-sm text-ink-primary">{transfer.note}</p>
          </div>
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
