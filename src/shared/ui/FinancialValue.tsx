type FinancialValueTone = 'neutral' | 'positive' | 'negative';

interface FinancialValueProps {
  /** Valor em centavos (inteiro) — nunca float (Seção 36). */
  cents: number;
  tone?: FinancialValueTone;
  /** Mostra +/- explícito além da cor (Seção 12: nunca só cor). */
  showSign?: boolean;
  className?: string;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const TONE_CLASSES: Record<FinancialValueTone, string> = {
  neutral: 'text-ink-primary',
  positive: 'text-[#178a44]',
  negative: 'text-financial-danger',
};

/**
 * Formatação monetária única do app — `R$ 12.485,72`, números tabulares
 * (Seção 8). Todo lugar que exibe dinheiro usa este componente, nunca
 * `toFixed`/template string solto, para manter formatação consistente.
 */
export function FinancialValue({
  cents,
  tone = 'neutral',
  showSign = false,
  className,
}: FinancialValueProps): React.ReactElement {
  const formatted = currencyFormatter.format(Math.abs(cents) / 100);
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';

  return (
    <span className={['money font-semibold', TONE_CLASSES[tone], className ?? ''].join(' ')}>
      {showSign ? `${sign} ` : ''}
      {formatted}
    </span>
  );
}
