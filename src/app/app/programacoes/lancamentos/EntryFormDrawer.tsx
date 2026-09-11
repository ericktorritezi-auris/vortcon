'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Drawer } from '@/shared/ui';
import { EMPTY_RECURRENCE, RecurrenceFields } from '@/shared/recurrence/RecurrenceFields';
import type { RecurrenceValues } from '@/shared/recurrence/RecurrenceFields';
import { EntryFormFields } from './EntryFormFields';
import type { EntryFormValues } from './EntryFormFields';

interface SimpleOption {
  id: string;
  name: string;
}

interface EntryFormDrawerProps {
  type: 'INCOME' | 'EXPENSE';
  origins: SimpleOption[];
  beneficiaries: SimpleOption[];
  defaultDate: string;
  onClose: () => void;
}

/**
 * Criar lançamento de Programação (Seção 14) — "Nova Receita"/"Nova
 * Despesa" criam LANÇAMENTOS DE PROGRAMAÇÃO, nunca transações
 * financeiras (Seção 1: "PROGRAMAR NÃO É MOVIMENTAR"). Recorrência
 * reaproveita o mesmo componente/mecânica do domínio financeiro, sem
 * nenhuma mudança (pedido explícito do cliente).
 */
export function EntryFormDrawer({
  type,
  origins,
  beneficiaries,
  defaultDate,
  onClose,
}: EntryFormDrawerProps): React.ReactElement {
  const router = useRouter();
  const [values, setValues] = useState<EntryFormValues>({
    originId: null,
    beneficiaryId: null,
    description: '',
    amountCents: 0,
    entryDate: defaultDate,
  });
  const [recurrence, setRecurrence] = useState<RecurrenceValues>(EMPTY_RECURRENCE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!values.beneficiaryId) {
      setError('Selecione o beneficiário.');
      return;
    }
    if (!values.description.trim()) {
      setError('Informe uma descrição.');
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
        ? await fetch('/api/programacoes/recorrencias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              description: values.description,
              baseAmountCents: values.amountCents,
              startDate: values.entryDate,
              defaultOriginId: values.originId ?? undefined,
              defaultBeneficiaryId: values.beneficiaryId,
              frequency: recurrence.frequency,
              interval: recurrence.interval,
              endDate: recurrence.endDate || undefined,
              maxOccurrences: recurrence.maxOccurrences
                ? Number(recurrence.maxOccurrences)
                : undefined,
            }),
          })
        : await fetch('/api/programacoes/lancamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              originId: values.originId ?? undefined,
              beneficiaryId: values.beneficiaryId,
              description: values.description,
              amountCents: values.amountCents,
              entryDate: values.entryDate,
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
      title={type === 'INCOME' ? 'Nova receita programada' : 'Nova despesa programada'}
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
        <p className="rounded-md bg-surface-page px-3 py-2 text-xs text-ink-secondary">
          Isto é um controle de Programações — nunca afeta seu saldo, suas contas ou seus relatórios
          financeiros até você clicar em &quot;Gerar transação&quot;.
        </p>
        <EntryFormFields
          values={values}
          onChange={setValues}
          origins={origins}
          beneficiaries={beneficiaries}
        />
        <RecurrenceFields
          values={recurrence}
          onChange={setRecurrence}
          toggleLabel={type === 'INCOME' ? 'Receita recorrente' : 'Despesa recorrente'}
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
