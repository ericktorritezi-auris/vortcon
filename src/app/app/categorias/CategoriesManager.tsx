'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resolveIcon } from '@/shared/design-system/icons';
import type { IconKey } from '@/shared/design-system/icons';
import { Badge, Button, IconPicker, Input } from '@/shared/ui';

interface CategoryView {
  id: string;
  name: string;
  iconKey: string;
  active: boolean;
}

/**
 * Gerenciamento de categorias (pedido do cliente): editar nome/ícone,
 * inativa continua na listagem (com selo), exclusão de verdade quando não
 * vinculada a nada.
 */
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIconKey, setEditIconKey] = useState<IconKey>('wallet' as IconKey);
  const [rowError, setRowError] = useState<string | null>(null);

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
    if (!window.confirm('Inativar esta categoria? O histórico das transações é preservado.')) {
      return;
    }
    await fetch(`/api/categories/${categoryId}/deactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleReactivate(categoryId: string): Promise<void> {
    await fetch(`/api/categories/${categoryId}/reactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleDelete(categoryId: string): Promise<void> {
    if (
      !window.confirm(
        'Excluir esta categoria de vez? Só funciona se ela nunca tiver sido usada em nenhum lançamento ou recorrência.',
      )
    ) {
      return;
    }
    setRowError(null);
    const response = await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) {
      setRowError(body.message ?? 'Não foi possível excluir esta categoria.');
      return;
    }
    router.refresh();
  }

  async function handleSaveEdit(categoryId: string): Promise<void> {
    await fetch(`/api/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, iconKey: editIconKey }),
    });
    setEditingId(null);
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
            <div
              key={category.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {editingId === category.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      label="Nome"
                      hideLabel
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <IconPicker
                      label="Ícone"
                      hideLabel
                      value={editIconKey}
                      onChange={setEditIconKey}
                    />
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-primary">
                    {category.name}
                    {!category.active ? <Badge tone="neutral">Inativa</Badge> : null}
                  </p>
                )}
              </div>

              {editingId === category.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => handleSaveEdit(category.id)}>
                    Salvar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                      setEditIconKey(category.iconKey as IconKey);
                    }}
                  >
                    Editar
                  </Button>
                  {category.active ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeactivate(category.id)}
                    >
                      Inativar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReactivate(category.id)}
                    >
                      Reativar
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => handleDelete(category.id)}>
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {categories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-secondary">Nenhuma categoria ainda.</p>
        ) : null}
      </div>

      {rowError ? <p className="text-sm text-financial-danger">{rowError}</p> : null}

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
