'use client';

import { ArrowRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, FinancialValue } from '@/shared/ui';
import { TransferFormDrawer } from './TransferFormDrawer';

export interface TransferItemView {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  scheduledDate: string | Date;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  note: string | null;
}

interface SimpleOption {
  id: string;
  name: string;
}

interface TransfersViewProps {
  transfers: TransferItemView[];
  accounts: SimpleOption[];
}

const STATUS_LABEL: Record<TransferItemView['status'], string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  timeZone: 'UTC',
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

interface TransferDayGroup {
  key: string;
  label: string;
  items: TransferItemView[];
}

function groupTransfersByDay(transfers: TransferItemView[]): TransferDayGroup[] {
  const groups = new Map<string, TransferItemView[]>();

  for (const transfer of transfers) {
    const key = toDate(transfer.scheduledDate).toISOString().slice(0, 10);
    const existing = groups.get(key) ?? [];
    existing.push(transfer);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const label = dayFormatter.format(toDate(`${key}T12:00:00.000Z`));
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1), items };
    });
}

/**
 * Transferências entre contas (Seção 66-68) — menu próprio, separado de
 * Transações, a pedido explícito do cliente: transferir dinheiro entre as
 * próprias contas não é receita nem despesa, e misturar os dois na mesma
 * listagem confundia mais do que ajudava.
 */
export function TransfersView({ transfers, accounts }: TransfersViewProps): React.ReactElement {
  const [creating, setCreating] = useState(false);
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const dayGroups = useMemo(() => groupTransfersByDay(transfers), [transfers]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-primary">Transferências</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Nova transferência
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {dayGroups.map((group) => (
          <div key={group.key} className="rounded-lg border border-ink-secondary/15 bg-white">
            <div className="border-b border-ink-secondary/10 px-4 py-2.5">
              <span className="text-sm font-semibold text-ink-primary">{group.label}</span>
            </div>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {group.items.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm text-ink-primary">
                    <span>{accountsById.get(transfer.sourceAccountId)?.name ?? '—'}</span>
                    <ArrowRight className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
                    <span>{accountsById.get(transfer.destinationAccountId)?.name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={transfer.status === 'CANCELLED' ? 'neutral' : 'success'}>
                      {STATUS_LABEL[transfer.status]}
                    </Badge>
                    <FinancialValue cents={transfer.amountCents} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {dayGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-secondary/25 py-16 text-center text-sm text-ink-secondary">
            Nenhuma transferência ainda.
          </div>
        ) : null}
      </div>

      {creating ? (
        <TransferFormDrawer accounts={accounts} onClose={() => setCreating(false)} />
      ) : null}
    </div>
  );
}
