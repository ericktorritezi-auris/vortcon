'use client';

import { ArrowRight, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatMonthLabel, shiftMonthParam } from '@/shared/period';
import { Badge, Button, FinancialValue } from '@/shared/ui';
import { TransferDetailDrawer } from './TransferDetailDrawer';
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
  period: { from: string; to: string };
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
 * Transações a pedido do cliente. Mesma navegação de mês de Transações
 * (Setembro/2026, default mês atual) — sem isso, uma data como "Domingo,
 * 06" não dava pra saber de qual mês.
 */
export function TransfersView({
  transfers,
  accounts,
  period,
}: TransfersViewProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const accountsById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const dayGroups = useMemo(() => groupTransfersByDay(transfers), [transfers]);
  const monthLabel = formatMonthLabel(new Date(period.from));
  const selectedTransfer = transfers.find((transfer) => transfer.id === selectedId) ?? null;

  function navigateMonth(direction: 1 | -1): void {
    const monthValue = shiftMonthParam(period.from, direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', monthValue);
    params.delete('de');
    params.delete('ate');
    router.push(`/app/transferencias?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-primary">Transferências</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Nova transferência
        </Button>
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

      <div className="flex flex-col gap-4">
        {dayGroups.map((group) => (
          <div key={group.key} className="rounded-lg border border-ink-secondary/15 bg-white">
            <div className="border-b border-ink-secondary/10 px-4 py-2.5">
              <span className="text-sm font-semibold text-ink-primary">{group.label}</span>
            </div>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {group.items.map((transfer) => (
                <button
                  key={transfer.id}
                  type="button"
                  onClick={() => setSelectedId(transfer.id)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-surface-page sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-2 text-sm text-ink-primary">
                    <span className="truncate">
                      {accountsById.get(transfer.sourceAccountId)?.name ?? '—'}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-ink-secondary"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {accountsById.get(transfer.destinationAccountId)?.name ?? '—'}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      tone={
                        transfer.status === 'CANCELLED'
                          ? 'neutral'
                          : transfer.status === 'COMPLETED'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {STATUS_LABEL[transfer.status]}
                    </Badge>
                    <FinancialValue cents={transfer.amountCents} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {dayGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-secondary/25 py-16 text-center text-sm text-ink-secondary">
            Nenhuma transferência neste período.
          </div>
        ) : null}
      </div>

      {creating ? (
        <TransferFormDrawer accounts={accounts} onClose={() => setCreating(false)} />
      ) : null}

      {selectedTransfer ? (
        <TransferDetailDrawer
          transfer={selectedTransfer}
          accounts={accounts}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
