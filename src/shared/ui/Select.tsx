import { ChevronDown } from 'lucide-react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hideLabel?: boolean;
}

/**
 * Select nativo estilizado (Seção 14). Prefira o `<select>` nativo por
 * acessibilidade e suporte de teclado/leitor de tela de fábrica — um select
 * customizado só se justifica em `SearchableSelect`, quando há filtro por texto.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, error, hideLabel = false, id, className, ...props },
  ref,
): ReactNode {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-primary'}
      >
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={[
            'h-11 w-full appearance-none rounded-md border bg-white pl-3 pr-9 text-sm text-ink-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence',
            error ? 'border-financial-danger' : 'border-ink-secondary/30',
            className ?? '',
          ].join(' ')}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
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
