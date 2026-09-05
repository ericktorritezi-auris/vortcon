'use client';

import { useState } from 'react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';

/**
 * Página de uso único (Seção 162) — depois do primeiro admin criado, esta
 * tela sempre responde "já existe um administrador configurado", então não
 * há risco de deixá-la pública.
 */
export default function AdminBootstrapPage(): React.ReactElement {
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json()) as { message?: string };
      setMessage(
        body.message ??
          (response.ok ? 'Administrador criado.' : 'Não foi possível criar o administrador.'),
      );
    } catch {
      setMessage('Não foi possível criar o administrador agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout
      title="Configurar administrador"
      description="Informe o ADMIN_BOOTSTRAP_TOKEN configurado no Railway."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Token"
          name="token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />
        {message ? <p className="text-sm text-ink-secondary">{message}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Criar administrador
        </Button>
      </form>
    </AuthCardLayout>
  );
}
