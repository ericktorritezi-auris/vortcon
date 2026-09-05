'use client';

import { Tag as TagIcon, X } from 'lucide-react';
import { useState } from 'react';

interface TagOption {
  id: string;
  name: string;
}

interface TagPickerProps {
  label: string;
  availableTags: TagOption[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  hideLabel?: boolean;
}

/**
 * Seletor de tags (Seção 51-55). Tags são globais e transversais ao tenant —
 * o mesmo conjunto aparece em receitas e despesas, sem filtro por natureza
 * financeira. Ícone padrão de tag para todas (Seção 13).
 */
export function TagPicker({
  label,
  availableTags,
  selectedTagIds,
  onChange,
  hideLabel = false,
}: TagPickerProps): React.ReactElement {
  const [query, setQuery] = useState('');

  const selected = availableTags.filter((tag) => selectedTagIds.includes(tag.id));
  const suggestions = availableTags.filter(
    (tag) =>
      !selectedTagIds.includes(tag.id) &&
      tag.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
  );

  function toggleTag(tagId: string): void {
    onChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId],
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={hideLabel ? 'sr-only' : 'text-sm font-medium text-ink-primary'}>{label}</span>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-ink-secondary/30 bg-white p-2">
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-pill bg-brand-flow/10 px-2.5 py-1 text-xs font-medium text-brand-deep"
          >
            <TagIcon className="h-3 w-3" aria-hidden="true" />
            {tag.name}
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              aria-label={`Remover tag ${tag.name}`}
              className="ml-0.5 rounded-full hover:bg-brand-flow/20"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={selected.length === 0 ? 'Adicionar tags...' : ''}
          aria-label="Buscar tags"
          className="min-w-[8rem] flex-1 border-none text-sm text-ink-primary outline-none placeholder:text-ink-secondary"
        />
      </div>

      {query && suggestions.length > 0 ? (
        <ul className="max-h-40 overflow-y-auto rounded-md border border-ink-secondary/20 bg-white shadow-sm">
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => {
                  toggleTag(tag.id);
                  setQuery('');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-page"
              >
                <TagIcon className="h-3.5 w-3.5 text-ink-secondary" aria-hidden="true" />
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
