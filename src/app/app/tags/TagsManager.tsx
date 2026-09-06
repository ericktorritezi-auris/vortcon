'use client';

import { Tag as TagIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Input } from '@/shared/ui';

interface TagView {
  id: string;
  name: string;
}

export function TagsManager({ tags }: { tags: TagView[] }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar a tag.');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(tagId: string): Promise<void> {
    if (!window.confirm('Inativar esta tag? O histórico das transações é preservado.')) return;
    await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-secondary">
        Tags são globais — a mesma lista aparece tanto para despesas quanto para receitas.
      </p>

      <div className="flex flex-wrap gap-2 rounded-lg border border-ink-secondary/15 bg-white p-4">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-1.5">
            <Badge icon={<TagIcon className="h-3 w-3" aria-hidden="true" />}>{tag.name}</Badge>
            <button
              type="button"
              onClick={() => handleDeactivate(tag.id)}
              className="text-xs text-ink-secondary hover:text-financial-danger"
              aria-label={`Inativar tag ${tag.name}`}
            >
              Inativar
            </button>
          </div>
        ))}
        {tags.length === 0 ? (
          <p className="text-sm text-ink-secondary">Nenhuma tag ainda.</p>
        ) : null}
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-ink-secondary/25 p-4"
      >
        <p className="text-sm font-medium text-ink-primary">Nova tag</p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button type="submit" loading={loading}>
            Criar tag
          </Button>
        </div>
        {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
      </form>
    </div>
  );
}
