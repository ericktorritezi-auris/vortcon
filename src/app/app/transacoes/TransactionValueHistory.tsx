'use client';

import { X } from 'lucide-react';
import { FinancialValue } from '@/shared/ui';

export interface ValueHistoryRow {
  /** Id real (lançamento já salvo) ou uma key temporária (ainda não salvo nesta sessão de edição). */
  id: string;
  /** Rótulo já formatado ("18/09" ou "Hoje") — a data em si é sempre automática, nunca digitada. */
  when: string;
  deltaCents: number;
}

interface TransactionValueHistoryProps {
  rows: ValueHistoryRow[];
  /** Quando presente, cada linha ganha um ✕ — usado só na edição (Seção 78). */
  onRemove?: (id: string) => void;
}

/**
 * Histórico de ajustes de valor (evolução v1.7, pedido do cliente) — um
 * "diário" da transação: só documenta como o valor foi mudando (dia + valor
 * do ajuste), nunca uma descrição. Usado tanto no detalhe (somente leitura)
 * quanto na edição (com o ✕ de exclusão). Nunca aparece se a transação
 * nunca usou os botões +/- — sem histórico, sem seção.
 */
export function TransactionValueHistory({
  rows,
  onRemove,
}: TransactionValueHistoryProps): React.ReactElement | null {
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-ink-secondary">Histórico do valor</p>
      <div className="flex flex-col gap-1.5 rounded-md bg-surface-page px-3 py-2.5">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  aria-label="Excluir este lançamento do histórico"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-financial-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
              <span className="text-ink-secondary">{row.when}</span>
            </div>
            <FinancialValue cents={row.deltaCents} showSign />
          </div>
        ))}
      </div>
      {onRemove ? (
        <p className="mt-1 text-xs text-ink-secondary">
          O ✕ exclui o lançamento e refaz o valor total desta transação.
        </p>
      ) : null}
    </div>
  );
}
