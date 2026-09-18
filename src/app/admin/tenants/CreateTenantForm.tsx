'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, DateInput, Input, Select, Toggle } from '@/shared/ui';

interface PlanOption {
  id: string;
  label: string;
}

export function CreateTenantForm({ plans }: { plans: PlanOption[] }): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [exempt, setExempt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Só guia o navegador (Seção 113) — quem realmente impede data passada é
  // `validateFirstDueDate` no backend (rodado dentro do próprio serviço e
  // de novo na API), não este atributo `min`.
  const todayIso = new Date().toISOString().slice(0, 10);

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
          phone: phone || undefined,
          birthDate: birthDate || undefined,
          timezone,
          planId,
          condition: exempt ? 'EXEMPT' : 'PAID',
          firstDueDate,
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
      setPhone('');
      setBirthDate('');
      setFirstDueDate('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-ink-secondary/25 flex flex-col gap-4 rounded-lg border border-dashed p-4"
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
        <Input
          label="Telefone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          hint="Opcional"
        />
        <DateInput
          label="Nascimento"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
        />
        <Input
          label="Timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          hint="Padrão: America/Sao_Paulo — alterável (Seção 24)"
        />
        <Select
          label="Plano"
          value={planId}
          onChange={(event) => setPlanId(event.target.value)}
          options={plans.map((plan) => ({ value: plan.id, label: plan.label }))}
        />
        <DateInput
          label="1ª cobrança"
          min={todayIso}
          value={firstDueDate}
          onChange={(event) => setFirstDueDate(event.target.value)}
          hint="Nunca uma data já vencida (Seção 113) — os meses seguintes repetem o mesmo dia"
          required
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
