/**
 * Datas de cobrança (Seção 109/113 — evolução v1.6.1).
 *
 * Antes desta versão, a primeira mensalidade de um tenant novo era derivada
 * automaticamente: "dia X do mês em que o tenant for criado". Isso tinha um
 * bug real — se o tenant nascesse depois do dia X (ex.: dia 18, com X=10),
 * a primeira cobrança já nascia com `dueDate` no passado, e como a carência
 * (Seção 113) conta a partir do `dueDate`, o tenant podia ser bloqueado por
 * inadimplência minutos depois de criado, sem nunca ter tido chance de
 * pagar.
 *
 * A correção (decisão do cliente): o Admin escolhe a DATA exata da primeira
 * cobrança no momento em que cria o tenant (nunca um número de dia
 * abstrato) — um humano nunca escolhe uma data já vencida. O sistema nunca
 * mais deriva essa primeira data por conta própria. `dueDay` (1-28) continua
 * existindo só para as competências SEGUINTES (mês 2 em diante), extraído
 * do dia da data escolhida, e a data escolhida é usada literalmente (sem
 * nenhum ajuste) na primeira cobrança.
 *
 * Sem ajuste de dia útil por decisão explícita do cliente: a recorrência
 * repete o mesmo dia do mês indefinidamente (18/09 → 18/10 → 18/11 → ...),
 * mesmo cavalgando fim de semana/feriado.
 */

/** 1-28: nunca cai em dia inexistente em fevereiro (mesma regra de sempre). */
export const MIN_DUE_DAY = 1;
export const MAX_DUE_DAY = 28;

export function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function dueDateForCompetence(competence: Date, dueDay: number): Date {
  return new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth(), dueDay));
}

/** Extrai o dia do mês (UTC) de uma data civil — usado para as competências seguintes. */
export function dueDayFromDate(date: Date): number {
  return date.getUTCDate();
}

/** Comparação data-a-data (sem hora) — mesma granularidade de um campo `@db.Date`. */
export function isBeforeCalendarDay(date: Date, reference: Date): boolean {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const referenceDay = Date.UTC(
    reference.getUTCFullYear(),
    reference.getUTCMonth(),
    reference.getUTCDate(),
  );
  return day < referenceDay;
}

export type FirstDueDateValidation = { valid: true } | { valid: false; error: string };

/**
 * Default só para chamadas internas/programáticas que não passam
 * `firstDueDate` explicitamente (ex.: os testes de integração de outros
 * módulos, que só precisam de "um tenant qualquer" e não testam cobrança).
 * O fluxo real do Admin (`/api/admin/tenants`) NUNCA usa isto — lá
 * `firstDueDate` é obrigatório, sem default, exatamente para forçar a
 * escolha humana que elimina a causa raiz do bug antigo (Seção 113).
 *
 * Sempre retorna uma data válida por construção (nunca precisa de
 * `validateFirstDueDate` depois): hoje mesmo, quando o dia do mês está
 * dentro de 1-28; senão (dias 29/30/31, ~3 dias por mês em média), o dia 1
 * do mês seguinte — nunca no passado, nunca fora de 1-28.
 */
export function defaultFirstDueDate(today: Date): Date {
  const day = today.getUTCDate();
  if (day <= MAX_DUE_DAY) {
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day));
  }
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
}

/**
 * Validação da primeira data de cobrança escolhida pelo Admin (defesa em
 * profundidade — o formulário já bloqueia data passada no navegador, mas o
 * backend nunca confia só nisso: digitação direta na API, ou o formulário
 * ficando aberto de um dia pro outro, precisam ser cobertos aqui também).
 */
export function validateFirstDueDate(date: Date, today: Date): FirstDueDateValidation {
  if (isBeforeCalendarDay(date, today)) {
    return { valid: false, error: 'A primeira data de cobrança não pode estar no passado.' };
  }

  const day = dueDayFromDate(date);
  if (day < MIN_DUE_DAY || day > MAX_DUE_DAY) {
    return {
      valid: false,
      error: `O dia da primeira cobrança deve estar entre ${MIN_DUE_DAY} e ${MAX_DUE_DAY} (para nunca cair em um dia inexistente em fevereiro nos meses seguintes).`,
    };
  }

  return { valid: true };
}
