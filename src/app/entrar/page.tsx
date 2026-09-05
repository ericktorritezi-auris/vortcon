'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';

/**
 * `useSearchParams()` exige um limite de Suspense ao redor de quem o usa —
 * sem isso, `next build` falha ao pré-renderizar esta página (erro real
 * encontrado no primeiro deploy do Estágio 4). Por isso o formulário vive
 * num componente separado, e a página só exporta o Suspense + fallback.
 */
function LoginForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(body.message ?? 'Não foi possível entrar agora.');
        return;
      }

      const redirectTo = searchParams.get('redirect') ?? '/app';
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Usuário ou e-mail"
        name="username"
        autoComplete="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
      />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-financial-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={loading} className="mt-1 w-full">
        Entrar
      </Button>

      <Link
        href="/esqueci-senha"
        className="text-center text-sm text-brand-intelligence hover:underline"
      >
        Esqueci minha senha
      </Link>
    </form>
  );
}

export default function LoginPage(): React.ReactElement {
  return (
    <AuthCardLayout title="Entrar" description="Acesso exclusivo para assinantes.">
      <Suspense fallback={<div className="h-64" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
    </AuthCardLayout>
  );
}
