import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  iconToneClassName?: string;
  trend?: ReactNode;
  /** Série curta de números para o mini-gráfico (opcional — sem isso, nenhum gráfico é desenhado). */
  sparklineData?: number[];
  sparklineStrokeClassName?: string;
}

function Sparkline({
  data,
  strokeClassName = 'stroke-brand-flow',
}: {
  data: number[];
  strokeClassName?: string;
}) {
  if (data.length < 2) return null;

  const width = 72;
  const height = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline points={points} fill="none" strokeWidth={1.5} className={strokeClassName} />
    </svg>
  );
}

/**
 * Card de métrica reutilizável (Seção 14, 82) — usado no Dashboard e Cockpit
 * para saldo, receitas, despesas, pendências etc. `value` aceita ReactNode
 * para permitir `<FinancialValue />` já formatado. `sparklineData` é
 * opcional — cards existentes sem esse dado continuam idênticos a antes.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  iconToneClassName = 'bg-brand-deep',
  trend,
  sparklineData,
  sparklineStrokeClassName,
}: MetricCardProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-ink-secondary/15 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        {Icon ? (
          <span
            className={[
              'flex h-5 w-5 items-center justify-center rounded-sm',
              iconToneClassName,
            ].join(' ')}
          >
            <Icon className="h-3 w-3 text-white" aria-hidden="true" />
          </span>
        ) : null}
        <span className="text-xs font-semibold text-ink-secondary">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-xl font-bold tracking-tight">{value}</div>
          {trend ? <div className="mt-1 text-xs">{trend}</div> : null}
        </div>
        {sparklineData ? (
          <Sparkline data={sparklineData} strokeClassName={sparklineStrokeClassName} />
        ) : null}
      </div>
    </div>
  );
}
