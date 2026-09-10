'use client';

import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FinancialAccountType } from '@prisma/client';
import { Badge, Button, DateInput, FinancialValue, Input, MoneyInput, Select } from '@/shared/ui';

interface AccountView {
  id: string;
  name: string;
  type: FinancialAccountType;
  initialBalanceCents: number;
  active: boolean;
}

const TYPE_LABEL: Record<FinancialAccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  CASH: 'Dinheiro',
  OTHER: 'Outra',
};

/**
 * Gerenciamento de contas (pedido do cliente): editar nome/tipo, inativa
 * continua aparecendo na listagem (com selo), e exclusão de verdade quando
 * nada estiver vinculado — inativação continua sendo a opção segura
 * quando há vínculo, o backend decide e explica por quê.
 */
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<FinancialAccountType>('CHECKING');
  const [rowError, setRowError] = useState<string | null>(null);

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
        'Inativar esta conta? O histórico é preservado, mas ela some dos seletores de conta.',
      )
    ) {
      return;
    }
    await fetch(`/api/accounts/${accountId}/deactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleReactivate(accountId: string): Promise<void> {
    await fetch(`/api/accounts/${accountId}/reactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleDelete(accountId: string): Promise<void> {
    if (
      !window.confirm(
        'Excluir esta conta de vez? Só funciona se ela nunca tiver sido usada em nenhum lançamento, transferência ou recorrência.',
      )
    ) {
      return;
    }
    setRowError(null);
    const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) {
      setRowError(body.message ?? 'Não foi possível excluir esta conta.');
      return;
    }
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

  async function handleSaveEdit(accountId: string): Promise<void> {
    await fetch(`/api/accounts/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, type: editType }),
    });
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                {editingId === account.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      label="Nome"
                      hideLabel
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <Select
                      label="Tipo"
                      hideLabel
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as FinancialAccountType)}
                      options={Object.entries(TYPE_LABEL).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </div>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-primary">
                      {account.name}
                      {!account.active ? <Badge tone="neutral">Inativa</Badge> : null}
                    </p>
                    <p className="text-xs text-ink-secondary">{TYPE_LABEL[account.type]}</p>
                  </>
                )}
              </div>
            </div>

            {editingId === account.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => handleSaveEdit(account.id)}>
                  Salvar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </div>
            ) : editingBalanceId === account.id ? (
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-wrap items-center gap-2">
                <FinancialValue cents={account.initialBalanceCents} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(account.id);
                    setEditName(account.name);
                    setEditType(account.type);
                  }}
                >
                  Editar
                </Button>
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
                {account.active ? (
                  <Button size="sm" variant="danger" onClick={() => handleDeactivate(account.id)}>
                    Inativar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReactivate(account.id)}
                  >
                    Reativar
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(account.id)}>
                  Excluir
                </Button>
              </div>
            )}
          </div>
        ))}
        {accounts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-secondary">Nenhuma conta ainda.</p>
        ) : null}
      </div>

      {rowError ? <p className="text-sm text-financial-danger">{rowError}</p> : null}

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
