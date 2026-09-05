import { useId } from 'react';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hideLabel?: boolean;
  disabled?: boolean;
}

/**
 * Toggle (switch) do Design System. Usa `role="switch"` nativo de botão —
 * nunca um checkbox estilizado sem semântica correta (Seção 12).
 */
export function Toggle({
  label,
  checked,
  onChange,
  hideLabel = false,
  disabled = false,
}: ToggleProps): React.ReactElement {
  const id = useId();

  return (
    <div className="flex items-center gap-2.5">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence focus-visible:ring-offset-2',
          checked ? 'bg-brand-flow' : 'bg-ink-secondary/30',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm text-ink-primary'}>
        {label}
      </label>
    </div>
  );
}
