import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';

interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label: string;
  error?: string;
  hideLabel?: boolean;
  /** Valor em centavos (inteiro) — nunca float. Persistência real usa NUMERIC/DECIMAL (Seção 36). */
  valueInCents: number;
  onValueChange: (cents: number) => void;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

function digitsToCents(raw: string): number {
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
}

/**
 * Input monetário do Design System. O usuário digita apenas dígitos; o
 * componente formata como `R$ 12.485,72` (Seção 8) a cada tecla, e expõe o
 * valor ao consumidor sempre em centavos — nunca em ponto flutuante, para
 * eliminar de raiz a classe de bug de arredondamento financeiro (Seção 36).
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { label, error, hideLabel = false, id, valueInCents, onValueChange, className, ...props },
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
      <input
        ref={ref}
        id={inputId}
        type="text"
        inputMode="decimal"
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        value={formatCents(valueInCents)}
        onChange={(event) => onValueChange(digitsToCents(event.target.value))}
        className={[
          'money h-11 rounded-md border bg-white px-3 text-right text-sm text-ink-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence',
          error ? 'border-financial-danger' : 'border-ink-secondary/30',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-financial-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
