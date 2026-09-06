export interface GroupableTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amountCents: number;
  dueDate: string | Date;
  status: 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
}

export interface DayGroup<T> {
  key: string;
  label: string;
  totalCents: number;
  items: T[];
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

const dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit' });

/**
 * Agrupamento por dia (Seção 77) — dias mais recentes primeiro, com o total
 * do dia já calculado (receita soma, despesa subtrai; cancelada nunca conta
 * — mesma regra de exclusão do Financial Engine, Seção 59). Pura, sem
 * acoplamento a React, pra ser testável isoladamente.
 */
export function groupByDay<T extends GroupableTransaction>(items: T[]): DayGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = toDate(item.dueDate).toISOString().slice(0, 10);
    const existing = groups.get(key) ?? [];
    existing.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, dayItems]) => {
      const totalCents = dayItems.reduce((sum, item) => {
        if (item.status === 'CANCELLED') return sum;
        return sum + (item.type === 'INCOME' ? item.amountCents : -item.amountCents);
      }, 0);

      const label = dayFormatter.format(toDate(`${key}T12:00:00.000Z`));
      return {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        totalCents,
        items: dayItems,
      };
    });
}
