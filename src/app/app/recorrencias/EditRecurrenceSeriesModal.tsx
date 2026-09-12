'use client';

import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, MoneyInput, Modal, SearchableSelect } from '@/shared/ui';
import { SeriesModeRadios } from '@/shared/recurrence/SeriesModeRadios';
import type { SeriesActionMode } from '@/shared/recurrence/SeriesModeRadios';

interface SimpleOption {
  id: string;
  name: string;
}

interface EditRecurrenceSeriesModalProps {
  seriesId: string;
  seriesDescription: string | null;
  initialAmountCents: number;
  initialAccountId: string | null;
  initialCategoryId: string | null;
  accounts: SimpleOption[];
  categories: SimpleOption[];
  onClose: () => void;
}

/**
 * Editar série recorrente (pedido do cliente, evolução v1.3) — muda o
 * padrão da série e propaga conforme o modo escolhido. Nunca reescreve
 * uma ocorrência liquidada nem cancelada, nos dois modos — a API
 * rejeita e explica se o modo "tudo" não puder ser aplicado.
 */
export function EditRecurrenceSeriesModal({
  seriesId,
  seriesDescription,
  initialAmountCents,
  initialAccountId,
  initialCategoryId,
  accounts,
  categories,
  onClose,
}: EditRecurrenceSeriesModalProps): React.ReactElement {
  const router = useRouter();
  const [amountCents, setAmountCents] = useState(initialAmountCents);
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const [mode, setMode] = useState<SeriesActionMode>('FROM_NEXT_MONTH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/recurrencias/${seriesId}/alterar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseAmountCents: amountCents,
          defaultAccountId: accountId ?? undefined,
          defaultCategoryId: categoryId ?? undefined,
          mode,
        }),
      });
      const body = (await response.json()) as { message?: string; updatedOccurrences?: number };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível alterar a recorrência.');
        return;
      }
      setResult(`${body.updatedOccurrences ?? 0} ocorrência(s) atualizada(s).`);
      router.refresh();
    } catch {
      setError('Não foi possível alterar a recorrência agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Editar recorrência${seriesDescription ? ` — ${seriesDescription}` : ''}`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {!result ? (
            <Button onClick={handleSave} loading={loading} className="flex-1">
              Salvar
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <MoneyInput label="Valor" valueInCents={amountCents} onValueChange={setAmountCents} />
        <SearchableSelect
          label="Conta"
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="Selecione a conta"
        />
        <SearchableSelect
          label="Categoria"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Selecione a categoria (opcional)"
        />

        <SeriesModeRadios
          mode={mode}
          onChange={setMode}
          actionVerb="editadas"
          settledLabel="pago/recebido"
        />

        {result ? <p className="text-sm font-medium text-financial-success">{result}</p> : null}
        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-sm font-medium text-financial-danger"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
