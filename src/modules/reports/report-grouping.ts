export interface ReportMovement {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amountCents: number;
  dueDate: string | Date;
  status: 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
  categoryName: string | null;
  accountName: string;
}

export interface ReportMonthGroup {
  monthKey: string;
  monthLabel: string;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  movements: ReportMovement[];
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });

function monthLabelFor(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, 15));
  const name = monthFormatter.format(date);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${year}`;
}

/**
 * Agrupamento por mês (Seção 94, pedido explícito do cliente: "se o filtro
 * passar de um mês, tem que vir dividido por mês"). Cancelada nunca conta
 * no total do grupo — mesma regra de exclusão do Financial Engine (Seção
 * 59), mas a linha continua aparecendo na lista de movimentações (o
 * usuário precisa poder ver que algo foi cancelado no relatório).
 */
export function groupMovementsByMonth(movements: ReportMovement[]): ReportMonthGroup[] {
  const groups = new Map<string, ReportMovement[]>();

  for (const movement of movements) {
    const date = toDate(movement.dueDate);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const existing = groups.get(key) ?? [];
    existing.push(movement);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, monthMovements]) => {
      let incomeCents = 0;
      let expenseCents = 0;

      for (const movement of monthMovements) {
        if (movement.status === 'CANCELLED') continue;
        if (movement.type === 'INCOME') incomeCents += movement.amountCents;
        else expenseCents += movement.amountCents;
      }

      return {
        monthKey,
        monthLabel: monthLabelFor(monthKey),
        incomeCents,
        expenseCents,
        resultCents: incomeCents - expenseCents,
        movements: monthMovements.sort(
          (a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime(),
        ),
      };
    });
}
