export type FinancialValueTone = 'neutral' | 'positive' | 'negative';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export interface FormattedFinancialValue {
  formatted: string;
  sign: '' | '+' | '−';
  tone: FinancialValueTone;
}

/**
 * Lógica pura de formatação monetária (Seção 8, 36) — extraída do
 * componente FinancialValue para ser testável isoladamente, sem precisar
 * de ambiente de render de componente.
 *
 * Regra que corrigiu um bug real (relatado pelo cliente: saldo negativo de
 * -R$ 660,00 aparecendo como R$ 660,00 positivo): o sinal de menos em
 * valores negativos NUNCA é opcional — sempre aparece. showSign só
 * controla o "+" explícito em valores positivos. Cor também nunca fica
 * neutra "por esquecimento": sem tone explícito, negativo sempre vem
 * vermelho.
 */
export function formatFinancialValue(
  cents: number,
  options: { tone?: FinancialValueTone; showSign?: boolean } = {},
): FormattedFinancialValue {
  const formatted = currencyFormatter.format(Math.abs(cents) / 100);
  const sign: FormattedFinancialValue['sign'] =
    cents < 0 ? '−' : cents > 0 && options.showSign ? '+' : '';
  const tone: FinancialValueTone = options.tone ?? (cents < 0 ? 'negative' : 'neutral');

  return { formatted, sign, tone };
}
