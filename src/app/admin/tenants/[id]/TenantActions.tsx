'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Input, Select, Toggle } from '@/shared/ui';
import { MAX_DUE_DAY, MIN_DUE_DAY } from '@/modules/subscriptions/billing-dates';

export function PayChargeButton({
  tenantId,
  chargeId,
}: {
  tenantId: string;
  chargeId: string;
}): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePay(): Promise<void> {
    setLoading(true);
    try {
      await fetch(`/api/admin/tenants/${tenantId}/charges/${chargeId}/pay`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={handlePay} loading={loading}>
      Registrar pagamento
    </Button>
  );
}

export function LiftBlockButton({
  tenantId,
  blockId,
}: {
  tenantId: string;
  blockId: string;
}): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLift(): Promise<void> {
    setLoading(true);
    try {
      await fetch(`/api/admin/tenants/${tenantId}/blocks/${blockId}/lift`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={handleLift} loading={loading}>
      Levantar bloqueio
    </Button>
  );
}

interface PlanOption {
  id: string;
  label: string;
}

/**
 * Edição da assinatura pelo Admin (evolução v1.7.1, pedido do cliente):
 * Plano, Condição (Pagante ↔ Isento) e dia de Vencimento. Um "Salvar" só —
 * os três campos vão juntos no mesmo PATCH, mesmo padrão do resto do app.
 * Efeitos de cada campo (confirmados com o cliente antes de implementar):
 * trocar o plano re-precifica o valor contratado pro preço atual do novo
 * plano; virar Isento cancela mensalidades pendentes e levanta bloqueio de
 * inadimplência ativo (se houver); mudar o Vencimento só vale pra próxima
 * mensalidade gerada, nunca reescreve uma já existente.
 */
export function EditSubscriptionForm({
  tenantId,
  plans,
  currentPlanId,
  currentCondition,
  currentDueDay,
}: {
  tenantId: string;
  plans: PlanOption[];
  currentPlanId: string;
  currentCondition: 'PAID' | 'EXEMPT';
  currentDueDay: number;
}): React.ReactElement {
  const router = useRouter();
  const [planId, setPlanId] = useState(currentPlanId);
  const [exempt, setExempt] = useState(currentCondition === 'EXEMPT');
  const [dueDay, setDueDay] = useState(String(currentDueDay));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          condition: exempt ? 'EXEMPT' : 'PAID',
          dueDay: Number(dueDay),
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível salvar.');
        return;
      }
      router.refresh();
    } catch {
      setError('Não foi possível salvar agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Plano"
          value={planId}
          onChange={(event) => setPlanId(event.target.value)}
          options={plans.map((plan) => ({ value: plan.id, label: plan.label }))}
        />
        <Input
          label="Vencimento (dia)"
          type="number"
          min={MIN_DUE_DAY}
          max={MAX_DUE_DAY}
          value={dueDay}
          onChange={(event) => setDueDay(event.target.value)}
          hint="1 a 28 — vale a partir da próxima mensalidade gerada"
        />
        <div className="flex items-end pb-2.5">
          <Toggle label="Isento (sem cobrança)" checked={exempt} onChange={setExempt} />
        </div>
      </div>
      {exempt && currentCondition === 'PAID' ? (
        <p className="text-xs text-ink-secondary">
          Ao salvar: cancela mensalidades pendentes deste tenant e levanta bloqueio de inadimplência
          ativo, se houver.
        </p>
      ) : null}
      {error ? <p className="text-sm text-financial-danger">{error}</p> : null}
      <Button type="submit" loading={loading} className="w-fit">
        Salvar alterações
      </Button>
    </form>
  );
}

export function CreateBlockForm({ tenantId }: { tenantId: string }): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate(type: 'ADMINISTRATIVE' | 'SECURITY'): Promise<void> {
    setLoading(true);
    try {
      await fetch(`/api/admin/tenants/${tenantId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="danger"
        loading={loading}
        onClick={() => handleCreate('ADMINISTRATIVE')}
      >
        Bloquear (administrativo)
      </Button>
      <Button size="sm" variant="danger" loading={loading} onClick={() => handleCreate('SECURITY')}>
        Bloquear (segurança)
      </Button>
    </div>
  );
}
