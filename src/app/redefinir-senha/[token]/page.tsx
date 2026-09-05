'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';

interface ResetPasswordPageProps {
  params: { token: string };
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps): React.ReactElement {
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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, password }),
      });
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(body.message ?? 'Não foi possível redefinir sua senha.');
        return;
      }

      router.push('/entrar');
    } catch {
      setError('Não foi possível redefinir sua senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout title="Defina uma nova senha" description="Mínimo de 8 caracteres.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <Input
          label="Confirmar nova senha"
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
          Redefinir senha
        </Button>
      </form>
    </AuthCardLayout>
  );
}
