/**
 * "Às 08:00 timezone do tenant" (Seção 117) exige saber, para um fuso IANA
 * qualquer, que horas são agora e qual é "hoje" nesse fuso — sem isso, um
 * job rodando em UTC (Railway) erraria o horário de disparo para qualquer
 * usuário fora de UTC. Puro, sem I/O, testável isoladamente.
 */
export function currentHourInTimeZone(timeZone: string, now: Date = new Date()): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).format(now);
  const hour = Number(formatted) % 24;
  return hour;
}

/** "Hoje" no fuso do usuário, como string YYYY-MM-DD — nunca a data UTC do servidor. */
export function todayDateStringInTimeZone(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

/** Converte "YYYY-MM-DD" para o Date UTC-meia-noite usado nos campos @db.Date do schema. */
export function dateStringToUtcMidnight(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}
