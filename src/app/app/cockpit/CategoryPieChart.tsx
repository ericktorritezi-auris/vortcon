'use client';

const PALETTE = [
  '#1F6F5C',
  '#2E86AB',
  '#F0A202',
  '#D64550',
  '#6C5B7B',
  '#355C7D',
  '#F67280',
  '#99B898',
  '#E84A5F',
  '#5B8C5A',
];

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface CategoryPieChartProps {
  title: string;
  data: { label: string; valueCents: number }[];
  emptyMessage: string;
}

/**
 * Gráfico de pizza por categoria (Seção 86: "gráficos") — a pedido do
 * cliente, reformulando os destaques em percentual visual. Sem dependência
 * externa (conic-gradient, suportado por todo navegador moderno). Cor
 * nunca é único indicador (Seção 12) — cada fatia tem rótulo + percentual
 * em texto na legenda, não só a cor.
 */
export function CategoryPieChart({
  title,
  data,
  emptyMessage,
}: CategoryPieChartProps): React.ReactElement {
  const sorted = [...data]
    .filter((row) => row.valueCents > 0)
    .sort((a, b) => b.valueCents - a.valueCents);
  const total = sorted.reduce((sum, row) => sum + row.valueCents, 0);

  if (total === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink-primary">{title}</h3>
        <p className="text-sm text-ink-secondary">{emptyMessage}</p>
      </div>
    );
  }

  let cumulative = 0;
  const stops = sorted
    .map((row, index) => {
      const startPercent = (cumulative / total) * 100;
      cumulative += row.valueCents;
      const endPercent = (cumulative / total) * 100;
      return `${PALETTE[index % PALETTE.length]} ${startPercent}% ${endPercent}%`;
    })
    .join(', ');

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink-primary">{title}</h3>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          className="h-32 w-32 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
          role="img"
          aria-label={`Gráfico de pizza: ${title}`}
        />
        <ul className="flex w-full flex-col gap-1.5">
          {sorted.map((row, index) => (
            <li key={row.label} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-ink-primary">{row.label}</span>
              <span className="shrink-0 text-xs text-ink-secondary">
                {currencyFormatter.format(row.valueCents / 100)}
              </span>
              <span className="w-10 shrink-0 text-right text-xs font-semibold text-ink-primary">
                {Math.round((row.valueCents / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
