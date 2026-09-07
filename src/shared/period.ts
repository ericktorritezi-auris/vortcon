export interface MonthPeriod {
  from: Date;
  to: Date;
}

interface MonthPeriodSearchParams {
  mes?: string;
  de?: string;
  ate?: string;
}

/**
 * Resolve o período do mês a partir de searchParams — usado por Transações
 * e Transferências (a pedido do cliente: mesma navegação de mês nas duas
 * telas). Default: mês atual. ?de=&ate= permite período personalizado.
 */
export function resolveMonthPeriod(searchParams: MonthPeriodSearchParams): MonthPeriod {
  if (searchParams.de && searchParams.ate) {
    return {
      from: new Date(`${searchParams.de}T00:00:00.000Z`),
      to: new Date(`${searchParams.ate}T23:59:59.999Z`),
    };
  }

  const monthParam = searchParams.mes;
  const now = new Date();
  const year = monthParam ? Number(monthParam.split('-')[0]) : now.getUTCFullYear();
  const month = monthParam ? Number(monthParam.split('-')[1]) : now.getUTCMonth() + 1;

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { from, to };
}

/**
 * "Setembro/2026" — formato compacto pedido pelo cliente, no lugar de
 * "Setembro De 2026" (o "De" maiúsculo vinha da classe CSS capitalize do
 * Tailwind capitalizando cada palavra, não só a primeira). timeZone: 'UTC'
 * é obrigatório aqui — date é meia-noite UTC do dia 1º do mês; sem isso, o
 * navegador do usuário reinterpretaria no fuso local e mostraria o mês
 * errado (mesmo bug já corrigido antes nesta tela).
 */
export function formatMonthLabel(date: Date): string {
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
  const month = monthFormatter.format(date);
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalized}/${date.getUTCFullYear()}`;
}

/** Próximo/anterior mês a partir de um período atual, preservando o formato YYYY-MM usado na URL. */
export function shiftMonthParam(currentFromIso: string, direction: 1 | -1): string {
  const currentFrom = new Date(currentFromIso);
  const nextMonth = new Date(
    Date.UTC(currentFrom.getUTCFullYear(), currentFrom.getUTCMonth() + direction, 1),
  );
  return `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
}
