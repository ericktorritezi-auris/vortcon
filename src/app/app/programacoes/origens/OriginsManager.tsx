'use client';

import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Input } from '@/shared/ui';

interface OriginView {
  id: string;
  name: string;
  active: boolean;
}

/**
 * Gerenciamento de Origens (Seções 3-6). Mesmo padrão de
 * CategoriesManager, sem ícone (pedido explícito do cliente).
 */
export function OriginsManager({ origins }: { origins: OriginView[] }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/programacoes/origens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar a origem.');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: string): Promise<void> {
    if (!window.confirm('Inativar esta origem? O histórico das programações é preservado.')) return;
    await fetch(`/api/programacoes/origens/${id}/deactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleReactivate(id: string): Promise<void> {
    await fetch(`/api/programacoes/origens/${id}/reactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleDelete(id: string): Promise<void> {
    if (
      !window.confirm(
        'Excluir esta origem de vez? Só funciona se ela nunca tiver sido usada em nenhum lançamento.',
      )
    ) {
      return;
    }
    setRowError(null);
    const response = await fetch(`/api/programacoes/origens/${id}`, { method: 'DELETE' });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) {
      setRowError(body.message ?? 'Não foi possível excluir esta origem.');
      return;
    }
    router.refresh();
  }

  async function handleSaveEdit(id: string): Promise<void> {
    await fetch(`/api/programacoes/origens/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
        {origins.map((origin) => (
          <div
            key={origin.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </span>
              {editingId === origin.id ? (
                <Input
                  label="Nome"
                  hideLabel
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              ) : (
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-primary">
                  {origin.name}
                  {!origin.active ? <Badge tone="neutral">Inativa</Badge> : null}
                </p>
              )}
            </div>

            {editingId === origin.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => handleSaveEdit(origin.id)}>
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
                    setEditingId(origin.id);
                    setEditName(origin.name);
                  }}
                >
                  Editar
                </Button>
                {origin.active ? (
                  <Button size="sm" variant="danger" onClick={() => handleDeactivate(origin.id)}>
                    Inativar
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleReactivate(origin.id)}>
                    Reativar
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(origin.id)}>
                  Excluir
                </Button>
              </div>
            )}
          </div>
        ))}
        {origins.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-secondary">Nenhuma origem ainda.</p>
        ) : null}
      </div>

      {rowError ? <p className="text-sm text-financial-danger">{rowError}</p> : null}

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-ink-secondary/25 p-4"
      >
        <p className="text-sm font-medium text-ink-primary">Nova origem</p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button type="submit" loading={loading}>
            Criar origem
          </Button>
        </div>
        {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
      </form>
    </div>
  );
}
