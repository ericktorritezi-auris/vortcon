import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hideLabel?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hideLabel = false, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2.5">
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        className={[
          'h-5 w-5 rounded-sm border-ink-secondary/40 text-brand-flow',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      <label htmlFor={checkboxId} className={hideLabel ? 'sr-only' : 'text-sm text-ink-primary'}>
        {label}
      </label>
    </div>
  );
});
