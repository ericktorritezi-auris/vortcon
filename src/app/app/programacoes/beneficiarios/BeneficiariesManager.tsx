'use client';

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Input } from '@/shared/ui';

interface BeneficiaryView {
  id: string;
  name: string;
  active: boolean;
}

/**
 * Gerenciamento de Beneficiários (Seções 7-10). Mesmo padrão de
 * CategoriesManager, sem ícone e sempre um cadastro simples (nunca um
 * CRM — pedido explícito do cliente).
 */
export function BeneficiariesManager({
  beneficiaries,
}: {
  beneficiaries: BeneficiaryView[];
}): React.ReactElement {
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
      const response = await fetch('/api/programacoes/beneficiarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar o beneficiário.');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: string): Promise<void> {
    if (!window.confirm('Inativar este beneficiário? O histórico das programações é preservado.'))
      return;
    await fetch(`/api/programacoes/beneficiarios/${id}/deactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleReactivate(id: string): Promise<void> {
    await fetch(`/api/programacoes/beneficiarios/${id}/reactivate`, { method: 'POST' });
    router.refresh();
  }

  async function handleDelete(id: string): Promise<void> {
    if (
      !window.confirm(
        'Excluir este beneficiário de vez? Só funciona se ele nunca tiver sido usado em nenhum lançamento.',
      )
    ) {
      return;
    }
    setRowError(null);
    const response = await fetch(`/api/programacoes/beneficiarios/${id}`, { method: 'DELETE' });
    const body = (await response.json()) as { message?: string };
    if (!response.ok) {
      setRowError(body.message ?? 'Não foi possível excluir este beneficiário.');
      return;
    }
    router.refresh();
  }

  async function handleSaveEdit(id: string): Promise<void> {
    await fetch(`/api/programacoes/beneficiarios/${id}`, {
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
        {beneficiaries.map((beneficiary) => (
          <div
            key={beneficiary.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-page text-ink-secondary">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              {editingId === beneficiary.id ? (
                <Input
                  label="Nome"
                  hideLabel
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              ) : (
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink-primary">
                  {beneficiary.name}
                  {!beneficiary.active ? <Badge tone="neutral">Inativo</Badge> : null}
                </p>
              )}
            </div>

            {editingId === beneficiary.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => handleSaveEdit(beneficiary.id)}>
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
                    setEditingId(beneficiary.id);
                    setEditName(beneficiary.name);
                  }}
                >
                  Editar
                </Button>
                {beneficiary.active ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeactivate(beneficiary.id)}
                  >
                    Inativar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleReactivate(beneficiary.id)}
                  >
                    Reativar
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(beneficiary.id)}>
                  Excluir
                </Button>
              </div>
            )}
          </div>
        ))}
        {beneficiaries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-secondary">Nenhum beneficiário ainda.</p>
        ) : null}
      </div>

      {rowError ? <p className="text-sm text-financial-danger">{rowError}</p> : null}

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-ink-secondary/25 p-4"
      >
        <p className="text-sm font-medium text-ink-primary">Novo beneficiário</p>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button type="submit" loading={loading}>
            Criar beneficiário
          </Button>
        </div>
        {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
      </form>
    </div>
  );
}
