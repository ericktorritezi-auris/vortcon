'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resolveIcon } from '@/shared/design-system/icons';
import type { IconKey } from '@/shared/design-system/icons';
import { Button, IconPicker, Input } from '@/shared/ui';

interface CategoryView {
  id: string;
  name: string;
  iconKey: string;
}

export function CategoriesManager({
  categories,
}: {
  categories: CategoryView[];
}): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [iconKey, setIconKey] = useState<IconKey>('wallet' as IconKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, iconKey }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar a categoria.');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(categoryId: string): Promise<void> {
    if (!window.confirm('Inativar esta categoria? O histórico das transações é preservado.'))
      return;
    await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-secondary">
        Categorias são globais — a mesma lista aparece tanto para despesas quanto para receitas.
      </p>

      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
        {categories.map((category) => {
          const Icon = resolveIcon(category.iconKey);
          return (
            <div key={category.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-ink-primary">{category.name}</p>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDeactivate(category.id)}>
                Inativar
              </Button>
            </div>
          );
        })}
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-secondary">Nenhuma categoria ainda.</p>
        ) : null}
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-ink-secondary/25 p-4"
      >
        <p className="text-sm font-medium text-ink-primary">Nova categoria</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <IconPicker label="Ícone" value={iconKey} onChange={setIconKey} />
        </div>
        {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-fit">
          Criar categoria
        </Button>
      </form>
    </div>
  );
}
