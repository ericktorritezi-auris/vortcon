import { describe, expect, it } from 'vitest';
import { formatFinancialValue } from './financial-value-format';

describe('formatFinancialValue — bug relatado: saldo negativo sem sinal de menos', () => {
  it('reproduz exatamente o cenário reportado: saldo inicial 300, despesa 960, saldo real deveria ser -660', () => {
    const initialBalanceCents = 30000;
    const expensePaidCents = 96000;
    const realBalanceCents = initialBalanceCents - expensePaidCents;

    expect(realBalanceCents).toBe(-66000);

    const result = formatFinancialValue(realBalanceCents);
    expect(result.sign).toBe('−');
    expect(result.formatted).toBe('R$\u00A0660,00');
    expect(result.tone).toBe('negative');
  });

  it('sinal de menos aparece SEMPRE em negativo, mesmo sem showSign (a causa raiz do bug)', () => {
    const result = formatFinancialValue(-1000, { showSign: false });
    expect(result.sign).toBe('−');
  });

  it('sinal de mais só aparece em positivo quando showSign é true', () => {
    expect(formatFinancialValue(1000, { showSign: false }).sign).toBe('');
    expect(formatFinancialValue(1000, { showSign: true }).sign).toBe('+');
  });

  it('zero nunca tem sinal', () => {
    expect(formatFinancialValue(0, { showSign: true }).sign).toBe('');
    expect(formatFinancialValue(0).tone).toBe('neutral');
  });

  it('cor é derivada automaticamente do sinal quando tone não é passado', () => {
    expect(formatFinancialValue(-500).tone).toBe('negative');
    expect(formatFinancialValue(500).tone).toBe('neutral');
  });

  it('tone explícito sempre vence a derivação automática', () => {
    expect(formatFinancialValue(500, { tone: 'positive' }).tone).toBe('positive');
    expect(formatFinancialValue(-500, { tone: 'neutral' }).tone).toBe('neutral');
  });

  it('valor absoluto é sempre exibido sem sinal embutido no número formatado', () => {
    expect(formatFinancialValue(-66000).formatted).toBe('R$\u00A0660,00');
    expect(formatFinancialValue(66000).formatted).toBe('R$\u00A0660,00');
  });
});
