import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-secondary/10 text-ink-secondary',
  success: 'bg-financial-success/10 text-[#178a44]',
  danger: 'bg-financial-danger/10 text-[#c62f2f]',
  warning: 'bg-financial-warning/10 text-[#a15c05]',
  info: 'bg-financial-info/10 text-[#1c5fc9]',
};

/**
 * Badge de estado (Seção 12: nenhum estado crítico depende só de cor — por
 * isso o texto é sempre explícito, e o `icon` opcional reforça o significado
 * para quem não distingue cor).
 */
export function Badge({ tone = 'neutral', children, icon }: BadgeProps): React.ReactElement {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      {icon}
      {children}
    </span>
  );
}
