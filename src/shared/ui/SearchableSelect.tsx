'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  hideLabel?: boolean;
  emptyMessage?: string;
}

/**
 * Combobox com filtro por texto (Seção 14) — usado quando a lista de opções
 * é longa (ex.: categorias/contas com muitos itens). Segue o padrão ARIA
 * combobox: `role="listbox"`, `aria-expanded`, navegação por teclado básica.
 */
export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  hideLabel = false,
  emptyMessage = 'Nenhum resultado encontrado.',
}: SearchableSelectProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!query) return options;
    const normalized = query.toLocaleLowerCase('pt-BR');
    return options.filter((option) => option.label.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [options, query]);

  function handleSelect(optionValue: string): void {
    onChange(optionValue);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <span className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-primary'}>
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 items-center justify-between rounded-md border border-ink-secondary/30 bg-white px-3 text-left text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence"
      >
        <span className={selected ? '' : 'text-ink-secondary'}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute top-full z-10 mt-1 w-full rounded-md border border-ink-secondary/20 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-ink-secondary/10 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full text-sm text-ink-primary outline-none placeholder:text-ink-secondary"
            />
          </div>
          <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-secondary">{emptyMessage}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-page"
                    >
                      {option.label}
                      {isSelected ? (
                        <Check className="h-4 w-4 text-brand-flow" aria-hidden="true" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
