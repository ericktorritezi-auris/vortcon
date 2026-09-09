/**
 * Regra de carência (Seção 113: "vencimento dia 10, bloqueio dia 15" = 5
 * dias). Arquivo próprio, sem nenhuma dependência de Prisma/banco — assim
 * a fronteira exata (4 dias nunca bloqueia, 5 dias sempre bloqueia) é
 * testável em memória, com objetos Date controlados, sem depender da
 * truncagem de um campo `@db.Date` (que guarda só a data, sem hora) indo
 * e voltando do banco. Foi exatamente essa truncagem que tornava o teste
 * de fronteira instável no CI (Estágio 18) — a mesma "exatamente 5 dias"
 * podia truncar pra um lado ou outro dependendo do horário exato em que o
 * pipeline rodava.
 */
export const DELINQUENCY_GRACE_DAYS = 5;

export function computeDaysPastDue(dueDate: Date, today: Date): number {
  return Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
}

export function isOverdueEnoughToBlock(dueDate: Date, today: Date): boolean {
  return computeDaysPastDue(dueDate, today) >= DELINQUENCY_GRACE_DAYS;
}
