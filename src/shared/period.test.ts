import { describe, expect, it } from 'vitest';
import { formatMonthLabel, resolveMonthPeriod, shiftMonthParam } from './period';

describe('resolveMonthPeriod', () => {
  it('sem parâmetros, usa o mês atual do relógio', () => {
    const now = new Date();
    const period = resolveMonthPeriod({});
    expect(period.from.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(period.from.getUTCMonth()).toBe(now.getUTCMonth());
    expect(period.from.getUTCDate()).toBe(1);
  });

  it('com ?mes=, resolve o mês exato pedido', () => {
    const period = resolveMonthPeriod({ mes: '2026-09' });
    expect(period.from.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(period.to.toISOString()).toBe('2026-09-30T23:59:59.999Z');
  });

  it('respeita meses com quantidades diferentes de dias (fevereiro)', () => {
    const period = resolveMonthPeriod({ mes: '2026-02' });
    expect(period.to.getUTCDate()).toBe(28);
  });

  it('?de=&ate= tem prioridade sobre ?mes=', () => {
    const period = resolveMonthPeriod({ mes: '2026-01', de: '2026-09-10', ate: '2026-09-20' });
    expect(period.from.toISOString().slice(0, 10)).toBe('2026-09-10');
    expect(period.to.toISOString().slice(0, 10)).toBe('2026-09-20');
  });
});

describe('formatMonthLabel', () => {
  it('formata como "Setembro/2026" — não "Setembro De 2026"', () => {
    expect(formatMonthLabel(new Date('2026-09-01T00:00:00.000Z'))).toBe('Setembro/2026');
  });

  it('só a primeira letra é maiúscula, nunca cada palavra', () => {
    expect(formatMonthLabel(new Date('2026-01-01T00:00:00.000Z'))).toBe('Janeiro/2026');
  });
});

describe('shiftMonthParam', () => {
  it('avança um mês', () => {
    expect(shiftMonthParam('2026-09-01T00:00:00.000Z', 1)).toBe('2026-10');
  });

  it('volta um mês', () => {
    expect(shiftMonthParam('2026-09-01T00:00:00.000Z', -1)).toBe('2026-08');
  });

  it('vira o ano corretamente em dezembro para janeiro', () => {
    expect(shiftMonthParam('2026-12-01T00:00:00.000Z', 1)).toBe('2027-01');
  });

  it('vira o ano corretamente em janeiro para dezembro do ano anterior', () => {
    expect(shiftMonthParam('2026-01-01T00:00:00.000Z', -1)).toBe('2025-12');
  });
});
