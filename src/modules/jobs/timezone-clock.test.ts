import { describe, expect, it } from 'vitest';
import {
  currentHourInTimeZone,
  dateStringToUtcMidnight,
  todayDateStringInTimeZone,
} from './timezone-clock';

describe('currentHourInTimeZone', () => {
  it('calcula a hora correta em São Paulo (UTC-3) a partir de um instante UTC', () => {
    const now = new Date('2026-09-06T11:00:00.000Z');
    expect(currentHourInTimeZone('America/Sao_Paulo', now)).toBe(8);
  });

  it('calcula a hora correta em UTC mesmo', () => {
    const now = new Date('2026-09-06T08:00:00.000Z');
    expect(currentHourInTimeZone('UTC', now)).toBe(8);
  });

  it('a mesma hora UTC dá horas diferentes em fusos diferentes (prova que o fuso importa)', () => {
    const now = new Date('2026-09-06T11:00:00.000Z');
    const spHour = currentHourInTimeZone('America/Sao_Paulo', now);
    const utcHour = currentHourInTimeZone('UTC', now);
    expect(spHour).not.toBe(utcHour);
  });
});

describe('todayDateStringInTimeZone', () => {
  it('retorna o dia anterior em São Paulo quando UTC já virou o dia seguinte', () => {
    const now = new Date('2026-09-07T01:00:00.000Z');
    expect(todayDateStringInTimeZone('America/Sao_Paulo', now)).toBe('2026-09-06');
    expect(todayDateStringInTimeZone('UTC', now)).toBe('2026-09-07');
  });
});

describe('dateStringToUtcMidnight', () => {
  it('converte YYYY-MM-DD para o Date UTC-meia-noite correspondente', () => {
    expect(dateStringToUtcMidnight('2026-09-06').toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });
});
