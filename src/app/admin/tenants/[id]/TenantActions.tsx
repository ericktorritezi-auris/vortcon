'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/shared/ui';

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
