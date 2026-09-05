import { Calendar } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

/**
 * Input de data civil (vencimento, nascimento, competência — Seção 37).
 * Usa `type="date"` nativo (acessível, teclado do SO, sem biblioteca extra)
 * com valor em `YYYY-MM-DD`; a formatação de exibição `dd/mm/aaaa` (Seção 8)
 * é responsabilidade de quem lê o valor persistido, não deste componente.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { label, error, hideLabel = false, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-primary'}
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type="date"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={[
            'h-11 w-full rounded-md border bg-white pl-3 pr-9 text-sm text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence',
            error ? 'border-financial-danger' : 'border-ink-secondary/30',
            className ?? '',
          ].join(' ')}
          {...props}
        />
        <Calendar
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-financial-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
