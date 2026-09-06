'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Drawer, Toggle } from '@/shared/ui';
import { TransactionFormFields } from './TransactionFormFields';
import type { TransactionFormValues } from './TransactionFormFields';

interface SimpleOption {
  id: string;
  name: string;
}

interface TransactionFormDrawerProps {
  type: 'INCOME' | 'EXPENSE';
  accounts: SimpleOption[];
  categories: SimpleOption[];
  tags: SimpleOption[];
  onClose: () => void;
}

const EMPTY_VALUES: TransactionFormValues = {
  description: '',
  amountCents: 0,
  dueDate: new Date().toISOString().slice(0, 10),
  accountId: '',
  categoryId: '',
  tagIds: [],
  note: '',
  reminderEnabled: false,
};

/** Criação de despesa/receita (Seção 56-57) — "pode ser cadastrada já paga" via o toggle de liquidação. */
export function TransactionFormDrawer({
  type,
  accounts,
  categories,
  tags,
  onClose,
}: TransactionFormDrawerProps): React.ReactElement {
  const router = useRouter();
  const [values, setValues] = useState<TransactionFormValues>(EMPTY_VALUES);
  const [alreadySettled, setAlreadySettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!values.description || values.amountCents <= 0 || !values.accountId) {
      setError('Preencha descrição, valor e conta.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: values.description,
          amountCents: values.amountCents,
          dueDate: values.dueDate,
          accountId: values.accountId,
          categoryId: values.categoryId || undefined,
          tagIds: values.tagIds,
          note: values.note || undefined,
          reminderEnabled: values.reminderEnabled,
          settlementDate: alreadySettled ? new Date().toISOString() : undefined,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível salvar.');
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Não foi possível salvar agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={type === 'INCOME' ? 'Nova receita' : 'Nova despesa'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TransactionFormFields
          values={values}
          onChange={setValues}
          accounts={accounts}
          categories={categories}
          tags={tags}
        />
        <Toggle
          label={type === 'INCOME' ? 'Já recebida' : 'Já paga'}
          checked={alreadySettled}
          onChange={setAlreadySettled}
        />
        {error ? (
          <p role="alert" className="text-sm font-medium text-financial-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}
