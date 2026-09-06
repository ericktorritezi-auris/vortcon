import type { FinancialValueTone } from './financial-value-format';
import { formatFinancialValue } from './financial-value-format';

interface FinancialValueProps {
  /** Valor em centavos (inteiro) — nunca float (Seção 36). */
  cents: number;
  /** Sem isso, a cor é derivada automaticamente do sinal (negativo = vermelho) — nunca fica neutro "por esquecimento". */
  tone?: FinancialValueTone;
  /** Mostra "+" explícito em valores positivos (o "−" em negativos já é sempre mostrado, nunca opcional). */
  showSign?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<FinancialValueTone, string> = {
  neutral: 'text-ink-primary',
  positive: 'text-[#178a44]',
  negative: 'text-financial-danger',
};

/**
 * Formatação monetária única do app — `R$ 12.485,72`, números tabulares
 * (Seção 8). Todo lugar que exibe dinheiro usa este componente, nunca
 * `toFixed`/template string solto, para manter formatação consistente.
 *
 * A lógica de sinal/cor vive em `financial-value-format.ts` (testável
 * isoladamente) — corrigiu um bug real relatado pelo cliente: saldo
 * negativo aparecendo sem o sinal de menos, como se fosse positivo.
 */
export function FinancialValue({
  cents,
  tone,
  showSign = false,
  className,
}: FinancialValueProps): React.ReactElement {
  const { formatted, sign, tone: effectiveTone } = formatFinancialValue(cents, { tone, showSign });

  return (
    <span
      className={['money font-semibold', TONE_CLASSES[effectiveTone], className ?? ''].join(' ')}
    >
      {sign ? `${sign} ` : ''}
      {formatted}
    </span>
  );
}
