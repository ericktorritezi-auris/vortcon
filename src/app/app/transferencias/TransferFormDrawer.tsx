'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Drawer } from '@/shared/ui';
import { EMPTY_RECURRENCE, RecurrenceFields } from '@/shared/recurrence/RecurrenceFields';
import type { RecurrenceValues } from '@/shared/recurrence/RecurrenceFields';
import { TransferFormFields } from './TransferFormFields';
import type { TransferFormValues } from './TransferFormFields';

interface SimpleOption {
  id: string;
  name: string;
}

interface TransferFormDrawerProps {
  accounts: SimpleOption[];
  onClose: () => void;
}

const EMPTY_VALUES: TransferFormValues = {
  sourceAccountId: null,
  destinationAccountId: null,
  amountCents: 0,
  scheduledDate: new Date().toISOString().slice(0, 10),
  note: '',
};

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
  const [values, setValues] = useState<TransferFormValues>(EMPTY_VALUES);
  const [recurrence, setRecurrence] = useState<RecurrenceValues>(EMPTY_RECURRENCE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!values.sourceAccountId || !values.destinationAccountId) {
      setError('Selecione a conta de origem e a de destino.');
      return;
    }
    if (values.sourceAccountId === values.destinationAccountId) {
      setError('A conta de origem e destino não podem ser a mesma.');
      return;
    }
    if (values.amountCents <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = recurrence.enabled
        ? await fetch('/api/recurrencias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind: 'TRANSFER',
              description: values.note || undefined,
              baseAmountCents: values.amountCents,
              startDate: values.scheduledDate,
              defaultSourceAccountId: values.sourceAccountId,
              defaultDestinationAccountId: values.destinationAccountId,
              frequency: recurrence.frequency,
              interval: recurrence.interval,
              endDate: recurrence.endDate || undefined,
              maxOccurrences: recurrence.maxOccurrences
                ? Number(recurrence.maxOccurrences)
                : undefined,
            }),
          })
        : await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceAccountId: values.sourceAccountId,
              destinationAccountId: values.destinationAccountId,
              amountCents: values.amountCents,
              scheduledDate: values.scheduledDate,
              note: values.note || undefined,
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
        <TransferFormFields values={values} onChange={setValues} accounts={accounts} />
        <RecurrenceFields
          values={recurrence}
          onChange={setRecurrence}
          toggleLabel="Transferência recorrente"
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
