'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, DateInput, Drawer, Input, MoneyInput, SearchableSelect } from '@/shared/ui';

interface SimpleOption {
  id: string;
  name: string;
}

interface TransferFormDrawerProps {
  accounts: SimpleOption[];
  onClose: () => void;
}

/**
 * Transferência entre contas (Seção 66-68). Entidade própria — nunca
 * receita nem despesa, nunca aparece na listagem de Transações (Seção 76),
 * de propósito: transferir dinheiro entre suas próprias contas não é
 * ganhar nem gastar.
 */
export function TransferFormDrawer({
  accounts,
  onClose,
}: TransferFormDrawerProps): React.ReactElement {
  const router = useRouter();
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!sourceAccountId || !destinationAccountId) {
      setError('Selecione a conta de origem e a de destino.');
      return;
    }
    if (sourceAccountId === destinationAccountId) {
      setError('A conta de origem e destino não podem ser a mesma.');
      return;
    }
    if (amountCents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAccountId,
          destinationAccountId,
          amountCents,
          scheduledDate,
          note: note || undefined,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível transferir.');
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Não foi possível transferir agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Nova transferência"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">
            Transferir
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <MoneyInput label="Valor" valueInCents={amountCents} onValueChange={setAmountCents} />
        <SearchableSelect
          label="De (conta de origem)"
          value={sourceAccountId}
          onChange={setSourceAccountId}
          options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          placeholder="Selecione a conta de origem"
        />
        <SearchableSelect
          label="Para (conta de destino)"
          value={destinationAccountId}
          onChange={setDestinationAccountId}
          options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          placeholder="Selecione a conta de destino"
        />
        <DateInput
          label="Data"
          value={scheduledDate}
          onChange={(event) => setScheduledDate(event.target.value)}
          required
        />
        <Input
          label="Observação"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="Opcional"
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
