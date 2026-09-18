import { describe, expect, it } from 'vitest';
import {
  defaultFirstDueDate,
  dueDateForCompetence,
  dueDayFromDate,
  firstDayOfMonth,
  isBeforeCalendarDay,
  MAX_DUE_DAY,
  MIN_DUE_DAY,
  validateFirstDueDate,
} from './billing-dates';

describe('billing-dates (evolução v1.6.1 — primeira cobrança escolhida pelo Admin)', () => {
  it('firstDayOfMonth normaliza qualquer dia do mês pro dia 1 (UTC)', () => {
    expect(firstDayOfMonth(new Date('2026-09-18T00:00:00.000Z')).toISOString().slice(0, 10)).toBe(
      '2026-09-01',
    );
  });

  it('dueDateForCompetence monta a data do dia informado dentro do mês da competência', () => {
    const competence = new Date('2026-10-01T00:00:00.000Z');
    expect(dueDateForCompetence(competence, 18).toISOString().slice(0, 10)).toBe('2026-10-18');
  });

  it('dueDayFromDate extrai o dia do mês (UTC) de uma data civil', () => {
    expect(dueDayFromDate(new Date('2026-09-18T00:00:00.000Z'))).toBe(18);
  });

  it('isBeforeCalendarDay compara só a data, ignorando a hora', () => {
    const today = new Date('2026-09-18T23:59:00.000Z');
    expect(isBeforeCalendarDay(new Date('2026-09-18T00:00:00.000Z'), today)).toBe(false);
    expect(isBeforeCalendarDay(new Date('2026-09-17T23:59:59.000Z'), today)).toBe(true);
    expect(isBeforeCalendarDay(new Date('2026-09-19T00:00:00.000Z'), today)).toBe(false);
  });

  describe('validateFirstDueDate', () => {
    const today = new Date('2026-09-18T12:00:00.000Z');

    it('aceita hoje mesmo (0 dias de folga, dia dentro de 1-28)', () => {
      expect(validateFirstDueDate(new Date('2026-09-18T00:00:00.000Z'), today)).toEqual({
        valid: true,
      });
    });

    it('aceita uma data futura dentro de 1-28', () => {
      expect(validateFirstDueDate(new Date('2026-10-05T00:00:00.000Z'), today)).toEqual({
        valid: true,
      });
    });

    it('rejeita data no passado — nunca deixa nascer já vencida', () => {
      const result = validateFirstDueDate(new Date('2026-09-17T00:00:00.000Z'), today);
      expect(result.valid).toBe(false);
    });

    it(`rejeita dia do mês fora de ${MIN_DUE_DAY}-${MAX_DUE_DAY}`, () => {
      const result = validateFirstDueDate(new Date('2026-09-30T00:00:00.000Z'), today);
      expect(result.valid).toBe(false);
    });

    it('rejeita dia 29 (fevereiro nunca tem 29 em ano não-bissexto)', () => {
      const futureToday = new Date('2027-01-01T00:00:00.000Z');
      const result = validateFirstDueDate(new Date('2027-01-29T00:00:00.000Z'), futureToday);
      expect(result.valid).toBe(false);
    });
  });

  describe('defaultFirstDueDate (só para chamadas internas sem firstDueDate explícito)', () => {
    it('usa o próprio dia de hoje quando está dentro de 1-28', () => {
      const today = new Date('2026-09-18T12:00:00.000Z');
      expect(defaultFirstDueDate(today).toISOString().slice(0, 10)).toBe('2026-09-18');
    });

    it('cai pro dia 1 do mês seguinte quando hoje é dia 29/30/31 (nunca no passado, nunca fora de 1-28)', () => {
      const today = new Date('2026-08-31T12:00:00.000Z');
      const result = defaultFirstDueDate(today);
      expect(result.toISOString().slice(0, 10)).toBe('2026-09-01');
      expect(validateFirstDueDate(result, today)).toEqual({ valid: true });
    });

    it('vira o ano corretamente quando hoje é 31 de dezembro', () => {
      const today = new Date('2026-12-31T12:00:00.000Z');
      const result = defaultFirstDueDate(today);
      expect(result.toISOString().slice(0, 10)).toBe('2027-01-01');
      expect(validateFirstDueDate(result, today)).toEqual({ valid: true });
    });

    it('o resultado é sempre válido por construção, para qualquer dia do mês', () => {
      for (let day = 1; day <= 31; day += 1) {
        const today = new Date(Date.UTC(2026, 0, day, 12));
        if (today.getUTCDate() !== day) continue; // meses com menos dias (não é o caso de janeiro)
        const result = defaultFirstDueDate(today);
        expect(validateFirstDueDate(result, today)).toEqual({ valid: true });
      }
    });
  });
});
