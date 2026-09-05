import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
}

/**
 * Input global do Design System (Seção 14). Label sempre associado via
 * `htmlFor`/`id` (Seção 12: HTML semântico, labels). Erro é anunciado via
 * `aria-describedby` + `role="alert"` — nunca comunicado só por cor.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, hideLabel = false, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-primary'}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={[
          'h-11 rounded-md border bg-white px-3 text-sm text-ink-primary placeholder:text-ink-secondary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence',
          error ? 'border-financial-danger' : 'border-ink-secondary/30',
          'disabled:cursor-not-allowed disabled:bg-surface-page disabled:opacity-70',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-ink-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-financial-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
