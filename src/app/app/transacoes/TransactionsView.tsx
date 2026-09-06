'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { resolveIcon } from '@/shared/design-system/icons';
import { Badge, Button, FinancialValue, Pagination } from '@/shared/ui';
import { TransactionDetailDrawer } from './TransactionDetailDrawer';
import { TransactionFormDrawer } from './TransactionFormDrawer';
import { TransferFormDrawer } from './TransferFormDrawer';
import { groupByDay } from './transaction-grouping';

export interface TransactionItemView {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  dueDate: string | Date;
  settlementDate: string | Date | null;
  status: 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
  accountId: string;
  categoryId: string | null;
  category: { id: string; name: string; iconKey: string } | null;
  tags: { tag: { id: string; name: string } }[];
  note: string | null;
  reminderEnabled: boolean;
}

interface PaginatedData {
  items: TransactionItemView[];
  total: number;
  page: number;
  totalPages: number;
}

interface SimpleOption {
  id: string;
  name: string;
}

interface CategoryOption extends SimpleOption {
  iconKey: string;
}

interface TransactionsViewProps {
  initialData: PaginatedData;
  accounts: SimpleOption[];
  categories: CategoryOption[];
  tags: SimpleOption[];
  period: { from: string; to: string };
  /** Balanço do mês inteiro (entradas − saídas), independente de paginação — vem do Financial Engine, não é somado a partir da página atual. */
  periodResultCents: number;
}

const STATUS_LABEL: Record<TransactionItemView['status'], string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

/**
 * Transações — UX (Seção 76-80): abas Despesas/Receitas, filtro de mês
 * (default mês atual), listagem agrupada por dia com total do dia,
 * paginação real (máx. 15, nunca infinite scroll). Cor nunca é único
 * indicador (Seção 12) — FinancialValue com showSign sempre mostra +/-
 * além da cor.
 */
export function TransactionsView({
  initialData,
  accounts,
  categories,
  tags,
  period,
  periodResultCents,
}: TransactionsViewProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<'INCOME' | 'EXPENSE' | null>(null);
  const [transferring, setTransferring] = useState(false);

  const activeType = searchParams.get('tipo') ?? 'todas';
  const dayGroups = useMemo(() => groupByDay(initialData.items), [initialData.items]);
  const selectedTransaction = initialData.items.find((item) => item.id === selectedId) ?? null;

  function updateParam(key: string, value: string | null): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    if (key !== 'pagina') params.delete('pagina');
    router.push(`/app/transacoes?${params.toString()}`);
  }

  function navigateMonth(direction: 1 | -1): void {
    const currentFrom = new Date(period.from);
    const nextMonth = new Date(
      Date.UTC(currentFrom.getUTCFullYear(), currentFrom.getUTCMonth() + direction, 1),
    );
    const monthValue = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set('mes', monthValue);
    params.delete('de');
    params.delete('ate');
    params.delete('pagina');
    router.push(`/app/transacoes?${params.toString()}`);
  }

  const monthLabel = monthFormatter.format(new Date(period.from));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink-primary">Transações</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTransferring(true)}>
            Transferência
          </Button>
          <Button variant="secondary" onClick={() => setCreating('INCOME')}>
            Nova receita
          </Button>
          <Button onClick={() => setCreating('EXPENSE')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Nova despesa
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filtrar por natureza"
          className="flex gap-1 rounded-md bg-surface-page p-1"
        >
          {[
            { value: 'todas', label: 'Todas' },
            { value: 'despesas', label: 'Despesas' },
            { value: 'receitas', label: 'Receitas' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeType === tab.value}
              onClick={() => updateParam('tipo', tab.value === 'todas' ? null : tab.value)}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeType === tab.value
                  ? 'bg-white text-brand-deep shadow-sm'
                  : 'text-ink-secondary',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-ink-secondary/15 bg-white px-3 py-1.5">
            <span className="text-xs text-ink-secondary">Balanço do mês</span>
            <FinancialValue cents={periodResultCents} showSign />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              aria-label="Mês anterior"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-32 text-center text-sm font-medium capitalize text-ink-primary">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              aria-label="Próximo mês"
              className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {dayGroups.map((group) => (
          <div key={group.key} className="rounded-lg border border-ink-secondary/15 bg-white">
            <div className="flex items-center justify-between border-b border-ink-secondary/10 px-4 py-2.5">
              <span className="text-sm font-semibold text-ink-primary">{group.label}</span>
              <span className="text-xs text-ink-secondary">
                Total do dia:{' '}
                <FinancialValue
                  cents={group.totalCents}
                  showSign
                  tone={group.totalCents >= 0 ? 'positive' : 'negative'}
                />
              </span>
            </div>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {group.items.map((item) => {
                const CategoryIcon = resolveIcon(item.category?.iconKey);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-page"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                        <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-primary">{item.description}</p>
                        <p className="text-xs text-ink-secondary">
                          {item.type === 'INCOME' ? 'Receita' : 'Despesa'}
                          {item.category ? ` · ${item.category.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status !== 'PENDING' ? (
                        <Badge tone={item.status === 'CANCELLED' ? 'neutral' : 'success'}>
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      ) : null}
                      <FinancialValue
                        cents={item.type === 'INCOME' ? item.amountCents : -item.amountCents}
                        showSign
                        tone={item.type === 'INCOME' ? 'positive' : 'negative'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {dayGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-secondary/25 py-16 text-center text-sm text-ink-secondary">
            Nenhuma transação neste período.
          </div>
        ) : null}
      </div>

      <Pagination
        page={initialData.page}
        totalPages={initialData.totalPages}
        onPageChange={(nextPage) => updateParam('pagina', String(nextPage))}
      />

      {selectedTransaction ? (
        <TransactionDetailDrawer
          transaction={selectedTransaction}
          accounts={accounts}
          categories={categories}
          tags={tags}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {creating ? (
        <TransactionFormDrawer
          type={creating}
          accounts={accounts}
          categories={categories}
          tags={tags}
          onClose={() => setCreating(null)}
        />
      ) : null}

      {transferring ? (
        <TransferFormDrawer accounts={accounts} onClose={() => setTransferring(false)} />
      ) : null}
    </div>
  );
}
