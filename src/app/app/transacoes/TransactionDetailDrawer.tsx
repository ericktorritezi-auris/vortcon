'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resolveIcon } from '@/shared/design-system/icons';
import { Badge, Button, Drawer, FinancialValue } from '@/shared/ui';
import { TransactionFormFields } from './TransactionFormFields';
import type { TransactionFormValues } from './TransactionFormFields';
import type { TransactionItemView } from './TransactionsView';

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

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

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
  });

  const CategoryIcon = resolveIcon(transaction.category?.iconKey);
  const isCancelled = transaction.status === 'CANCELLED';
  const isSettled = transaction.status === 'PAID' || transaction.status === 'RECEIVED';

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
        }),
      }),
    );
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
          {!isCancelled && !isSettled ? (
            <Button onClick={handleSettle} loading={loading} className="flex-1">
              {transaction.type === 'INCOME' ? 'Marcar como recebida' : 'Marcar como paga'}
            </Button>
          ) : null}
          {!isCancelled ? (
            <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
              Editar
            </Button>
          ) : null}
          {isCancelled ? (
            <Button
              variant="secondary"
              onClick={handleReactivate}
              loading={loading}
              className="flex-1"
            >
              Reativar
            </Button>
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
