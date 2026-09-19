'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resolveIcon } from '@/shared/design-system/icons';
import { Badge, Button, Drawer, FinancialValue, MoneyInput, Toggle } from '@/shared/ui';
import { TransactionFormFields } from './TransactionFormFields';
import type { TransactionFormValues } from './TransactionFormFields';
import type { TransactionItemView } from './TransactionsView';
import { TransactionValueHistory } from './TransactionValueHistory';
import type { ValueHistoryRow } from './TransactionValueHistory';

interface SimpleOption {
  id: string;
  name: string;
}

interface CategoryOption extends SimpleOption {
  iconKey: string;
}

interface TransactionDetailDrawerProps {
  transaction: TransactionItemView;
  accounts: SimpleOption[];
  categories: CategoryOption[];
  tags: SimpleOption[];
  onClose: () => void;
}

const STATUS_LABEL: Record<TransactionItemView['status'], string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

// timeZone: 'UTC' — dueDate/settlementDate são datas-calendário (meia-noite
// UTC), não instantes. Sem isso, o navegador do usuário reinterpretaria a
// meia-noite UTC no fuso local e mostraria o dia anterior (mesma causa raiz
// do bug de mês relatado em TransactionsView.tsx).
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

// Sem timeZone: 'UTC' aqui de propósito — createdAt do histórico de ajustes
// é um instante real (não uma data-calendário como dueDate), então formata
// no fuso do navegador, exibindo o dia como o usuário realmente viveu.
const historyDateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

function toDateInputValue(value: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

/**
 * Detalhe da transação (Seção 78) — modal/drawer responsivo com todos os
 * campos exigidos e as 4 ações (editar, pagar/receber, cancelar, reativar).
 * Editar troca para o formulário DENTRO do mesmo drawer (Seção 79: fluxo
 * rápido mobile "abrir -> marcar pago -> editar se necessario -> retornar" -
 * um segundo drawer por cima quebraria esse fluxo).
 */
export function TransactionDetailDrawer({
  transaction,
  accounts,
  categories,
  tags,
  onClose,
}: TransactionDetailDrawerProps): React.ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<TransactionFormValues>({
    description: transaction.description,
    amountCents: transaction.amountCents,
    dueDate: toDateInputValue(transaction.dueDate),
    accountId: transaction.accountId,
    categoryId: transaction.categoryId ?? '',
    tagIds: transaction.tags.map((link) => link.tag.id),
    note: transaction.note ?? '',
    reminderEnabled: transaction.reminderEnabled,
    affectsBalance: transaction.affectsBalance,
  });

  const CategoryIcon = resolveIcon(transaction.category?.iconKey);
  const isCancelled = transaction.status === 'CANCELLED';
  const isSettled = transaction.status === 'PAID' || transaction.status === 'RECEIVED';

  // Pedido do cliente (evolução v1.7) — histórico de ajustes de valor
  // (botões +/- da edição). Existe só enquanto o drawer de edição está
  // aberto: `pendingAdjustments` são deltas novos desta sessão (ainda não
  // salvos), `removedAdjustmentIds` são lançamentos já salvos que o usuário
  // excluiu (✕) nesta sessão — os dois só viram persistência de verdade
  // quando "Salvar" é clicado (mesmo ponto único de commit de sempre).
  const [pendingAdjustments, setPendingAdjustments] = useState<
    { key: string; deltaCents: number }[]
  >([]);
  const [removedAdjustmentIds, setRemovedAdjustmentIds] = useState<string[]>([]);
  const [adjustOpen, setAdjustOpen] = useState<'plus' | 'minus' | null>(null);
  const [adjustCents, setAdjustCents] = useState(0);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  function toggleAdjust(mode: 'plus' | 'minus'): void {
    setAdjustOpen((current) => (current === mode ? null : mode));
    setAdjustCents(0);
    setAdjustError(null);
  }

  function confirmAdjust(): void {
    if (!adjustOpen || adjustCents <= 0) return;
    const deltaCents = adjustOpen === 'minus' ? -adjustCents : adjustCents;
    const nextAmount = values.amountCents + deltaCents;
    if (nextAmount <= 0) {
      setAdjustError('O valor não pode ficar zerado ou negativo.');
      return;
    }
    setValues({ ...values, amountCents: nextAmount });
    setPendingAdjustments((current) => [...current, { key: crypto.randomUUID(), deltaCents }]);
    setAdjustOpen(null);
    setAdjustCents(0);
    setAdjustError(null);
  }

  /** ✕ num lançamento novo desta sessão (ainda não salvo) — some da lista, sem chamada ao servidor. */
  function removePendingAdjustment(key: string): void {
    const entry = pendingAdjustments.find((item) => item.key === key);
    if (!entry) return;
    setValues({ ...values, amountCents: values.amountCents - entry.deltaCents });
    setPendingAdjustments((current) => current.filter((item) => item.key !== key));
  }

  /** ✕ num lançamento já salvo — marcado pra exclusão real no próximo "Salvar". */
  function removePersistedAdjustment(id: string): void {
    const entry = transaction.valueAdjustments.find((item) => item.id === id);
    if (!entry) return;
    setValues({ ...values, amountCents: values.amountCents - entry.deltaCents });
    setRemovedAdjustmentIds((current) => [...current, id]);
  }

  function handleRemoveHistoryRow(id: string): void {
    if (id.startsWith('pending:')) {
      removePendingAdjustment(id.slice('pending:'.length));
    } else {
      removePersistedAdjustment(id);
    }
  }

  const editHistoryRows: ValueHistoryRow[] = [
    ...transaction.valueAdjustments
      .filter((item) => !removedAdjustmentIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        when: historyDateFormatter.format(new Date(item.createdAt)),
        deltaCents: item.deltaCents,
      })),
    ...pendingAdjustments.map((item) => ({
      id: `pending:${item.key}`,
      when: 'Hoje',
      deltaCents: item.deltaCents,
    })),
  ];

  const detailHistoryRows: ValueHistoryRow[] = transaction.valueAdjustments.map((item) => ({
    id: item.id,
    when: historyDateFormatter.format(new Date(item.createdAt)),
    deltaCents: item.deltaCents,
  }));

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

  async function handleSettle(): Promise<void> {
    await runAction(() => fetch(`/api/transactions/${transaction.id}/settle`, { method: 'POST' }));
  }

  async function handleUnsettle(): Promise<void> {
    await runAction(() =>
      fetch(`/api/transactions/${transaction.id}/unsettle`, { method: 'POST' }),
    );
  }

  function handleToggleSettled(nextChecked: boolean): void {
    if (nextChecked) {
      void handleSettle();
    } else {
      void handleUnsettle();
    }
  }

  async function handleCancel(): Promise<void> {
    await runAction(() => fetch(`/api/transactions/${transaction.id}/cancel`, { method: 'POST' }));
  }

  async function handleReactivate(): Promise<void> {
    await runAction(() =>
      fetch(`/api/transactions/${transaction.id}/reactivate`, { method: 'POST' }),
    );
  }

  async function handleSaveEdit(): Promise<void> {
    await runAction(() =>
      fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: values.description,
          amountCents: values.amountCents,
          dueDate: values.dueDate,
          accountId: values.accountId,
          categoryId: values.categoryId || null,
          tagIds: values.tagIds,
          note: values.note || null,
          reminderEnabled: values.reminderEnabled,
          affectsBalance: values.affectsBalance,
          valueAdjustments: pendingAdjustments.map((item) => item.deltaCents),
          removeValueAdjustmentIds: removedAdjustmentIds,
        }),
      }),
    );
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm('Excluir esta transação de vez? Essa ação não pode ser desfeita.')) return;
    await runAction(() => fetch(`/api/transactions/${transaction.id}`, { method: 'DELETE' }));
  }

  if (editing) {
    return (
      <Drawer
        open
        onClose={onClose}
        title="Editar transação"
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
        <TransactionFormFields
          values={values}
          onChange={setValues}
          accounts={accounts}
          categories={categories}
          tags={tags}
          valueExtra={
            <div className="flex flex-col gap-2.5">
              <div className="-mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleAdjust('minus')}
                  aria-label="Diminuir valor (registra no histórico)"
                  className="border-ink-secondary/30 flex h-9 w-9 items-center justify-center rounded-md border bg-surface-card text-base font-bold text-ink-secondary"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => toggleAdjust('plus')}
                  aria-label="Aumentar valor (registra no histórico)"
                  className="border-ink-secondary/30 flex h-9 w-9 items-center justify-center rounded-md border bg-surface-card text-base font-bold text-ink-secondary"
                >
                  +
                </button>
              </div>
              {adjustOpen ? (
                <div className="border-ink-secondary/30 flex items-center gap-2 rounded-md border border-dashed bg-surface-page p-2">
                  <span className="text-sm font-semibold text-ink-secondary">
                    {adjustOpen === 'minus' ? '−' : '+'}
                  </span>
                  <MoneyInput
                    label="Valor do ajuste"
                    hideLabel
                    valueInCents={adjustCents}
                    onValueChange={setAdjustCents}
                    className="h-9"
                  />
                  <button
                    type="button"
                    onClick={confirmAdjust}
                    aria-label="Confirmar ajuste"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-financial-successText text-white"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              {adjustError ? (
                <p role="alert" className="text-xs font-medium text-financial-danger">
                  {adjustError}
                </p>
              ) : null}
              <p className="text-xs text-ink-secondary">
                Editar o valor acima direto não gera histórico. Use + ou − pra registrar o ajuste.
              </p>
              <TransactionValueHistory rows={editHistoryRows} onRemove={handleRemoveHistoryRow} />
            </div>
          }
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
      title={transaction.type === 'INCOME' ? 'Detalhe da receita' : 'Detalhe da despesa'}
      footer={
        <div className="flex flex-wrap gap-2">
          {!isCancelled ? (
            <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
              Editar
            </Button>
          ) : null}
          {isCancelled ? (
            <>
              <Button
                variant="secondary"
                onClick={handleReactivate}
                loading={loading}
                className="flex-1"
              >
                Reativar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={loading} className="flex-1">
                Excluir
              </Button>
            </>
          ) : (
            <Button variant="danger" onClick={handleCancel} loading={loading} className="flex-1">
              Cancelar
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
            <CategoryIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium text-ink-primary">{transaction.description}</p>
            <Badge tone={isCancelled ? 'neutral' : isSettled ? 'success' : 'warning'}>
              {STATUS_LABEL[transaction.status]}
            </Badge>
          </div>
        </div>

        {!isCancelled ? (
          <div className="border-ink-secondary/15 flex items-center justify-between rounded-md border bg-surface-page px-3 py-2.5">
            <span className="text-sm font-medium text-ink-primary">
              {transaction.type === 'INCOME' ? 'Recebida' : 'Paga'}
            </span>
            <Toggle
              label={transaction.type === 'INCOME' ? 'Marcar como recebida' : 'Marcar como paga'}
              hideLabel
              checked={isSettled}
              onChange={handleToggleSettled}
              disabled={loading}
            />
          </div>
        ) : null}

        <FinancialValue
          cents={transaction.type === 'INCOME' ? transaction.amountCents : -transaction.amountCents}
          showSign
          tone={transaction.type === 'INCOME' ? 'positive' : 'negative'}
          className="text-2xl"
        />

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-secondary">Vencimento</dt>
            <dd className="text-ink-primary">
              {dateFormatter.format(new Date(transaction.dueDate))}
            </dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Liquidação</dt>
            <dd className="text-ink-primary">
              {transaction.settlementDate
                ? dateFormatter.format(new Date(transaction.settlementDate))
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Conta</dt>
            <dd className="text-ink-primary">
              {accounts.find((a) => a.id === transaction.accountId)?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Categoria</dt>
            <dd className="text-ink-primary">{transaction.category?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Lembrete</dt>
            <dd className="text-ink-primary">
              {transaction.reminderEnabled ? 'Ativado' : 'Desativado'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Recorrência</dt>
            <dd className="text-ink-primary">Avulsa</dd>
          </div>
        </dl>

        <TransactionValueHistory rows={detailHistoryRows} />

        {transaction.tags.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-secondary">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {transaction.tags.map((link) => (
                <Badge key={link.tag.id}>{link.tag.name}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {transaction.note ? (
          <div>
            <p className="text-xs font-medium text-ink-secondary">Observação</p>
            <p className="text-sm text-ink-primary">{transaction.note}</p>
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
