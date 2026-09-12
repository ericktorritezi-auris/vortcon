'use client';

export type SeriesActionMode = 'ALL' | 'FROM_NEXT_MONTH';

interface SeriesModeRadiosProps {
  mode: SeriesActionMode;
  onChange: (mode: SeriesActionMode) => void;
  /** Ex.: "excluídas"/"editadas", pra compor o texto de cada opção. */
  actionVerb: string;
  /** Ex.: "pagas/recebidas" (financeiro) ou "convertidas em transação" (Programações). */
  settledLabel: string;
}

/**
 * Escolha de modo compartilhada entre excluir e editar série (pedido do
 * cliente, evolução v1.3) — mesmas duas opções nos dois casos, só o verbo
 * muda ("excluídas" vs "editadas").
 */
export function SeriesModeRadios({
  mode,
  onChange,
  actionVerb,
  settledLabel,
}: SeriesModeRadiosProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-ink-secondary/15 p-3 has-[:checked]:border-brand-flow has-[:checked]:bg-brand-flow/5">
        <input
          type="radio"
          name="series-action-mode"
          checked={mode === 'FROM_NEXT_MONTH'}
          onChange={() => onChange('FROM_NEXT_MONTH')}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-ink-primary">
            Do mês seguinte em diante (recomendado)
          </span>
          <span className="block text-xs text-ink-secondary">
            Nunca mexe no mês vigente nem no que já aconteceu — só ocorrências {actionVerb} a partir
            do mês que vem.
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2 rounded-md border border-ink-secondary/15 p-3 has-[:checked]:border-brand-flow has-[:checked]:bg-brand-flow/5">
        <input
          type="radio"
          name="series-action-mode"
          checked={mode === 'ALL'}
          onChange={() => onChange('ALL')}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-ink-primary">
            Tudo, inclusive o que já aconteceu
          </span>
          <span className="block text-xs text-ink-secondary">
            Só funciona se nada estiver {settledLabel} — se houver, desfaça isso primeiro, ou use a
            opção de cima.
          </span>
        </span>
      </label>
    </div>
  );
}
