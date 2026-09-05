'use client';

import { ICON_CATALOG, type IconKey } from '@/shared/design-system/icons';

interface IconPickerProps {
  label: string;
  value: IconKey | null;
  onChange: (iconKey: IconKey) => void;
  hideLabel?: boolean;
}

/**
 * Seletor de ícone para categorias (Seção 48). Restrito ao catálogo
 * controlado — nunca aceita upload ou SVG arbitrário do usuário (Seção 13).
 */
export function IconPicker({ label, value, onChange, hideLabel = false }: IconPickerProps): React.ReactElement {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-primary'}>{label}</legend>
      <div role="radiogroup" className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {(Object.keys(ICON_CATALOG) as IconKey[]).map((iconKey) => {
          const Icon = ICON_CATALOG[iconKey];
          const isSelected = iconKey === value;
          return (
            <button
              key={iconKey}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={iconKey}
              onClick={() => onChange(iconKey)}
              className={[
                'flex h-11 w-11 items-center justify-center rounded-md border transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence',
                isSelected
                  ? 'border-brand-flow bg-brand-flow/10 text-brand-deep'
                  : 'border-ink-secondary/20 text-ink-secondary hover:bg-surface-page',
              ].join(' ')}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
