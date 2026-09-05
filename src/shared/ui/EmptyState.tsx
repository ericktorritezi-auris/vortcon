import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vazio (Seção 206) — novo usuário, listas sem itens, filtros sem resultado. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-ink-secondary/25 px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-ink-secondary" aria-hidden="true" />
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-secondary">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
