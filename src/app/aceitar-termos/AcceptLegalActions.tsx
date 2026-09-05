'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/shared/ui';

export function AcceptLegalActions(): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/legal/accept', { method: 'POST' });
      if (!response.ok) {
        setError('Não foi possível registrar seu aceite agora. Tente novamente.');
        return;
      }
      router.push('/app');
      router.refresh();
    } catch {
      setError('Não foi possível registrar seu aceite agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/entrar');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm font-medium text-financial-danger">
          {error}
        </p>
      ) : null}
      <Button onClick={handleAccept} loading={loading} className="w-full">
        Li e aceito
      </Button>
      <button
        type="button"
        onClick={handleLogout}
        className="text-center text-sm text-ink-secondary hover:text-ink-primary hover:underline"
      >
        Sair
      </button>
    </div>
  );
}
