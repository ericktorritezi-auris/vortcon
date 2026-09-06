import { describe, expect, it } from 'vitest';
import { computeOccurrenceDates, toOccurrenceKey } from '@/modules/recurrence/date-sequence';

const iso = (date: Date): string => date.toISOString().slice(0, 10);

describe('geração de datas de recorrência (Seção 70, 75)', () => {
  it('MONTHLY gera uma data por mês, preservando o dia', () => {
    const dates = computeOccurrenceDates(
      {
        frequency: 'MONTHLY',
        interval: 1,
        startDate: new Date('2026-09-14'),
        endDate: null,
        maxOccurrences: 4,
      },
      new Date('2027-01-01'),
    );

    expect(dates.map(iso)).toEqual(['2026-09-14', '2026-10-14', '2026-11-14', '2026-12-14']);
  });

  it('MONTHLY em dia 31 cai para o último dia de meses mais curtos (Seção 0: sem Invalid Date)', () => {
    const dates = computeOccurrenceDates(
      {
        frequency: 'MONTHLY',
        interval: 1,
        startDate: new Date('2026-01-31'),
        endDate: null,
        maxOccurrences: 3,
      },
      new Date('2027-01-01'),
    );

    // Jan(31) → Fev(28, 2026 não é bissexto) → Mar(31)
    expect(dates.map(iso)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('WEEKLY avança de 7 em 7 dias multiplicado pelo interval', () => {
    const dates = computeOccurrenceDates(
      {
        frequency: 'WEEKLY',
        interval: 2,
        startDate: new Date('2026-09-01'),
        endDate: null,
        maxOccurrences: 3,
      },
      new Date('2026-12-01'),
    );

    expect(dates.map(iso)).toEqual(['2026-09-01', '2026-09-15', '2026-09-29']);
  });

  it('YEARLY preserva mês e dia, avançando o ano', () => {
    const dates = computeOccurrenceDates(
      {
        frequency: 'YEARLY',
        interval: 1,
        startDate: new Date('2026-03-10'),
        endDate: null,
        maxOccurrences: 2,
      },
      new Date('2030-01-01'),
    );

    expect(dates.map(iso)).toEqual(['2026-03-10', '2027-03-10']);
  });

  it('respeita endDate mesmo quando maxOccurrences permitiria mais', () => {
    const dates = computeOccurrenceDates(
      {
        frequency: 'MONTHLY',
        interval: 1,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-01'),
        maxOccurrences: 12,
      },
      new Date('2027-01-01'),
    );

    expect(dates.map(iso)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('nunca gera além da janela futura (Seção 75: "não gerar anos infinitamente")', () => {
    const dates = computeOccurrenceDates(
      {
        frequency: 'DAILY',
        interval: 1,
        startDate: new Date('2026-01-01'),
        endDate: null,
        maxOccurrences: null,
      },
      new Date('2026-01-05'),
    );

    expect(dates.map(iso)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ]);
  });

  it('toOccurrenceKey produz uma chave estável no formato YYYY-MM-DD', () => {
    expect(toOccurrenceKey(new Date('2026-09-14T00:00:00.000Z'))).toBe('2026-09-14');
  });
});
