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

interface EditProgrammingSeriesModalProps {
  seriesId: string;
  seriesDescription: string | null;
  initialAmountCents: number;
  initialOriginId: string | null;
  initialBeneficiaryId: string;
  origins: SimpleOption[];
  beneficiaries: SimpleOption[];
  onClose: () => void;
}

/**
 * Editar série recorrente de Programações (pedido do cliente, evolução
 * v1.3) — mesmo padrão do domínio financeiro, mas a trava é diferente:
 * bloqueia o modo "tudo" se qualquer ocorrência já tiver sido convertida
 * em transação (nunca "pago/recebido", que não existe em Programações).
 */
export function EditProgrammingSeriesModal({
  seriesId,
  seriesDescription,
  initialAmountCents,
  initialOriginId,
  initialBeneficiaryId,
  origins,
  beneficiaries,
  onClose,
}: EditProgrammingSeriesModalProps): React.ReactElement {
  const router = useRouter();
  const [amountCents, setAmountCents] = useState(initialAmountCents);
  const [originId, setOriginId] = useState<string | null>(initialOriginId);
  const [beneficiaryId, setBeneficiaryId] = useState<string | null>(initialBeneficiaryId);
  const [mode, setMode] = useState<SeriesActionMode>('FROM_NEXT_MONTH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    if (!beneficiaryId) {
      setError('Selecione o beneficiário.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/programacoes/recorrencias/${seriesId}/alterar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseAmountCents: amountCents,
          defaultOriginId: originId ?? undefined,
          defaultBeneficiaryId: beneficiaryId,
          mode,
        }),
      });
      const body = (await response.json()) as { message?: string; updatedOccurrences?: number };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível alterar a série.');
        return;
      }
      setResult(`${body.updatedOccurrences ?? 0} ocorrência(s) atualizada(s).`);
      router.refresh();
    } catch {
      setError('Não foi possível alterar a série agora.');
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
          label="Beneficiário"
          value={beneficiaryId}
          onChange={setBeneficiaryId}
          options={beneficiaries.map((b) => ({ value: b.id, label: b.name }))}
          placeholder="Selecione o beneficiário"
        />
        <SearchableSelect
          label="Origem"
          value={originId}
          onChange={setOriginId}
          options={origins.map((o) => ({ value: o.id, label: o.name }))}
          placeholder="Selecione a origem (opcional)"
        />

        <SeriesModeRadios
          mode={mode}
          onChange={setMode}
          actionVerb="editadas"
          settledLabel="convertido em transação"
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
