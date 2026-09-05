'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';
import { PASSWORD_POLICY_DESCRIPTION } from '@/shared/security/password-policy';

interface AcceptInvitePageProps {
  params: { token: string };
}

/**
 * Definição da senha inicial (Seção 25). Ao concluir, o backend já autentica
 * (ver `accept-invite/route.ts`) — GLOBAL_ADMIN e TENANT_OWNER pousam em
 * áreas diferentes depois de ativar (Seção 22): admin vai para `/admin`,
 * nunca para `/app` (que lançaria erro de propósito — ver
 * `AccessPolicyService`). O próximo passo normativo para TENANT_OWNER seria
 * o gate legal (Seção 25: "Passa pelo gate legal"), já real desde o
 * Estágio 5 — `/app` decide isso sozinho.
 */
export default function AcceptInvitePage({ params }: AcceptInvitePageProps): React.ReactElement {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, password }),
      });
      const body = (await response.json()) as {
        message?: string;
        role?: 'GLOBAL_ADMIN' | 'TENANT_OWNER';
      };

      if (!response.ok) {
        setError(body.message ?? 'Não foi possível ativar sua conta.');
        return;
      }

      router.push(body.role === 'GLOBAL_ADMIN' ? '/admin' : '/app');
    } catch {
      setError('Não foi possível ativar sua conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout title="Bem-vindo à VortCon" description={PASSWORD_POLICY_DESCRIPTION}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <Input
          label="Confirmar senha"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
        />

        {error ? (
          <p role="alert" className="text-sm font-medium text-financial-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={loading} className="w-full">
          Ativar conta
        </Button>
      </form>
    </AuthCardLayout>
  );
}
