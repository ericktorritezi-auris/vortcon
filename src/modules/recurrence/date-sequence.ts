export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM_DAYS';

interface SeriesDateParams {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate: Date | null;
  maxOccurrences: number | null;
}

function lastDayOfMonth(year: number, monthIndexZeroBased: number): number {
  return new Date(Date.UTC(year, monthIndexZeroBased + 1, 0)).getUTCDate();
}

/**
 * Calcula a data da N-esima ocorrencia (0 = startDate). Meses/anos usam
 * startDate.getUTCDate() como o "dia alvo", limitando ao ultimo dia do
 * mes de destino quando ele nao existe (ex.: dia 31 caindo em abril vira
 * dia 30) - evita Invalid Date/estouro de mes do Date nativo.
 */
function occurrenceDateAt(params: SeriesDateParams, occurrenceIndex: number): Date {
  const { frequency, interval, startDate } = params;
  const step = interval * occurrenceIndex;

  switch (frequency) {
    case 'DAILY':
    case 'CUSTOM_DAYS':
      return new Date(startDate.getTime() + step * 24 * 60 * 60 * 1000);
    case 'WEEKLY':
      return new Date(startDate.getTime() + step * 7 * 24 * 60 * 60 * 1000);
    case 'MONTHLY': {
      const targetMonthIndex = startDate.getUTCMonth() + step;
      const targetYear = startDate.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
      const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
      const day = Math.min(
        startDate.getUTCDate(),
        lastDayOfMonth(targetYear, normalizedMonthIndex),
      );
      return new Date(Date.UTC(targetYear, normalizedMonthIndex, day));
    }
    case 'YEARLY': {
      const targetYear = startDate.getUTCFullYear() + step;
      const day = Math.min(
        startDate.getUTCDate(),
        lastDayOfMonth(targetYear, startDate.getUTCMonth()),
      );
      return new Date(Date.UTC(targetYear, startDate.getUTCMonth(), day));
    }
  }
}

/**
 * Gera as datas de ocorrencia dentro de uma janela futura razoavel (Secao
 * 75: "nao gerar anos infinitamente"), respeitando endDate/maxOccurrences
 * quando definidos. Usado tanto pela materializacao quanto pelos testes -
 * pura, sem I/O, sem acoplamento a Prisma.
 */
export function computeOccurrenceDates(params: SeriesDateParams, windowEnd: Date): Date[] {
  const dates: Date[] = [];

  for (let index = 0; ; index += 1) {
    if (params.maxOccurrences !== null && index >= params.maxOccurrences) break;

    const date = occurrenceDateAt(params, index);

    if (params.endDate && date > params.endDate) break;
    if (date > windowEnd) break;

    dates.push(date);
  }

  return dates;
}

export function toOccurrenceKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
