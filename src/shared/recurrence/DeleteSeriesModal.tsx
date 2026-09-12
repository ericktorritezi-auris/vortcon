'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Button, Modal } from '@/shared/ui';
import { SeriesModeRadios } from './SeriesModeRadios';
import type { SeriesActionMode } from './SeriesModeRadios';

export type { SeriesActionMode };

interface DeleteSeriesModalProps {
  open: boolean;
  seriesCount: number;
  /** Ex.: "pagas/recebidas" (financeiro) ou "convertidas em transação" (Programações) — usado na explicação do modo "tudo". */
  settledLabel: string;
  onConfirm: (mode: SeriesActionMode) => Promise<void>;
  onClose: () => void;
}

/**
 * Escolha de modo ao excluir série(s) recorrente(s) (pedido do cliente,
 * evolução v1.3) — nunca mais um "excluir tudo" só.
 */
export function DeleteSeriesModal({
  open,
  seriesCount,
  settledLabel,
  onConfirm,
  onClose,
}: DeleteSeriesModalProps): React.ReactElement | null {
  const [mode, setMode] = useState<SeriesActionMode>('FROM_NEXT_MONTH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(mode);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Excluir ${seriesCount} série(s) recorrente(s)`}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading} className="flex-1">
            Excluir
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <SeriesModeRadios
          mode={mode}
          onChange={setMode}
          actionVerb="excluídas"
          settledLabel={settledLabel}
        />

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
