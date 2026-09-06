'use client';

import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FinancialAccountType } from '@prisma/client';
import { Button, DateInput, FinancialValue, Input, MoneyInput, Select } from '@/shared/ui';

interface AccountView {
  id: string;
  name: string;
  type: FinancialAccountType;
  initialBalanceCents: number;
}

const TYPE_LABEL: Record<FinancialAccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CASH: 'Dinheiro',
  OTHER: 'Outra',
};

export function AccountsManager({ accounts }: { accounts: AccountView[] }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<FinancialAccountType>('CHECKING');
  const [initialBalanceCents, setInitialBalanceCents] = useState(0);
  const [initialBalanceDate, setInitialBalanceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [newBalanceCents, setNewBalanceCents] = useState(0);

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, initialBalanceCents, initialBalanceDate }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar a conta.');
        return;
      }
      setName('');
      setInitialBalanceCents(0);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(accountId: string): Promise<void> {
    if (
      !window.confirm(
        'Inativar esta conta? O histórico é preservado, mas ela some das listas de seleção.',
      )
    ) {
      return;
    }
    await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
    router.refresh();
  }

  async function handleUpdateBalance(accountId: string): Promise<void> {
    if (!window.confirm('Alterar o saldo inicial desta conta? Isso recalcula o saldo real dela.')) {
      return;
    }
    await fetch(`/api/accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalanceCents: newBalanceCents }),
    });
    setEditingBalanceId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-primary">{account.name}</p>
                <p className="text-xs text-ink-secondary">{TYPE_LABEL[account.type]}</p>
              </div>
            </div>

            {editingBalanceId === account.id ? (
              <div className="flex items-center gap-2">
                <MoneyInput
                  label="Novo saldo inicial"
                  hideLabel
                  valueInCents={newBalanceCents}
                  onValueChange={setNewBalanceCents}
                />
                <Button size="sm" onClick={() => handleUpdateBalance(account.id)}>
                  Salvar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingBalanceId(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <FinancialValue cents={account.initialBalanceCents} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingBalanceId(account.id);
                    setNewBalanceCents(account.initialBalanceCents);
                  }}
                >
                  Alterar saldo
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeactivate(account.id)}>
                  Inativar
                </Button>
              </div>
            )}
          </div>
        ))}
        {accounts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-secondary">Nenhuma conta ainda.</p>
        ) : null}
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-ink-secondary/25 p-4"
      >
        <p className="text-sm font-medium text-ink-primary">Nova conta</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Select
            label="Tipo"
            value={type}
            onChange={(event) => setType(event.target.value as FinancialAccountType)}
            options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <MoneyInput
            label="Saldo inicial"
            valueInCents={initialBalanceCents}
            onValueChange={setInitialBalanceCents}
          />
          <DateInput
            label="Data do saldo inicial"
            value={initialBalanceDate}
            onChange={(event) => setInitialBalanceDate(event.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-fit">
          Criar conta
        </Button>
      </form>
    </div>
  );
}
