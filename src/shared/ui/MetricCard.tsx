import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  iconToneClassName?: string;
  trend?: ReactNode;
}

/**
 * Card de métrica reutilizável (Seção 14, 82) — usado no Dashboard e Cockpit
 * para saldo, receitas, despesas, pendências etc. `value` aceita ReactNode
 * para permitir `<FinancialValue />` já formatado.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  iconToneClassName = 'bg-brand-deep',
  trend,
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
      <div className="text-xl font-bold tracking-tight">{value}</div>
      {trend ? <div className="mt-1 text-xs">{trend}</div> : null}
    </div>
  );
}
