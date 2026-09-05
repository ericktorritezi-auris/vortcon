'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, MoneyInput } from '@/shared/ui';

interface PlanRow {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PlansManager({ plans }: { plans: PlanRow[] }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [priceCents, setPriceCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, priceCents }),
      });
      if (!response.ok) {
        setError('Não foi possível criar o plano.');
        return;
      }
      setName('');
      setPriceCents(0);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(planId: string, active: boolean): Promise<void> {
    await fetch(`/api/admin/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="flex items-center justify-between rounded-lg border border-ink-secondary/15 bg-white p-4"
          >
            <div>
              <p className="font-medium text-ink-primary">{plan.name}</p>
              <p className="money text-sm text-ink-secondary">
                {currencyFormatter.format(plan.priceCents / 100)} / mês
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={plan.active ? 'success' : 'neutral'}>
                {plan.active ? 'Ativo' : 'Inativo'}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleToggle(plan.id, plan.active)}
              >
                {plan.active ? 'Inativar' : 'Reativar'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-ink-secondary/25 p-4"
      >
        <p className="text-sm font-medium text-ink-primary">Novo plano</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label
              className="mb-1.5 block text-sm font-medium text-ink-primary"
              htmlFor="plan-name"
            >
              Nome
            </label>
            <input
              id="plan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="h-11 w-full rounded-md border border-ink-secondary/30 bg-white px-3 text-sm"
            />
          </div>
          <MoneyInput
            label="Preço mensal"
            valueInCents={priceCents}
            onValueChange={setPriceCents}
          />
          <Button type="submit" loading={loading}>
            Criar plano
          </Button>
        </div>
        {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
      </form>
    </div>
  );
}
