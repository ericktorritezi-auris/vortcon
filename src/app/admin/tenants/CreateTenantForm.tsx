'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Select, Toggle } from '@/shared/ui';

interface PlanOption {
  id: string;
  label: string;
}

export function CreateTenantForm({ plans }: { plans: PlanOption[] }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [exempt, setExempt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          username,
          planId,
          condition: exempt ? 'EXEMPT' : 'PAID',
        }),
      });
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(body.message ?? 'Não foi possível criar o tenant.');
        return;
      }

      setName('');
      setEmail('');
      setUsername('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-dashed border-ink-secondary/25 p-4"
    >
      <p className="text-sm font-medium text-ink-primary">Novo tenant</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nome completo"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <Select
          label="Plano"
          value={planId}
          onChange={(event) => setPlanId(event.target.value)}
          options={plans.map((plan) => ({ value: plan.id, label: plan.label }))}
        />
      </div>
      <Toggle label="Isento (sem cobrança)" checked={exempt} onChange={setExempt} />
      {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
      <Button type="submit" loading={loading} className="w-fit">
        Criar tenant
      </Button>
    </form>
  );
}
