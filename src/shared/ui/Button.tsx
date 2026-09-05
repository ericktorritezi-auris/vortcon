import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-deep text-white hover:bg-[#0d2c34] focus-visible:ring-brand-deep',
  secondary:
    'bg-white text-brand-deep border border-ink-secondary/30 hover:bg-surface-page focus-visible:ring-brand-deep',
  ghost: 'bg-transparent text-brand-deep hover:bg-surface-page focus-visible:ring-brand-deep',
  danger: 'bg-financial-danger text-white hover:bg-[#dc3d3d] focus-visible:ring-financial-danger',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Botão global do Design System (Seção 14). Alvo de toque mínimo ~44px
 * (Seção 10) garantido por `h-11`/`h-12`; `sm` é reservado para contextos
 * densos de desktop, não para touch primário.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leadingIcon,
    disabled,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={disabled ?? loading}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : leadingIcon}
      {children}
    </button>
  );
});
