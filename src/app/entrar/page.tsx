'use client';

import { Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';
import {
  isBiometricEnabledOnThisDevice,
  isRunningStandalone,
  loginWithBiometric,
  registerBiometric,
  supportsBiometricLogin,
} from '@/modules/webauthn/webauthn-client';

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
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [offerBiometricSetup, setOfferBiometricSetup] = useState(true);

  // Seção 138/121 estendida — só sugere biometria dentro do app instalado
  // (Android: display-mode; iOS: navigator.standalone), nunca no navegador
  // comum, e só quando o próprio navegador confirma suportar.
  useEffect(() => {
    const available = supportsBiometricLogin() && isRunningStandalone();
    setBiometricAvailable(available);
    setBiometricEnabled(available && isBiometricEnabledOnThisDevice());
  }, []);

  function redirectAfterLogin(role: 'GLOBAL_ADMIN' | 'TENANT_OWNER' | undefined): void {
    if (role === 'GLOBAL_ADMIN') {
      router.push('/admin');
    } else {
      const redirectTo = searchParams.get('redirect') ?? '/app';
      router.push(redirectTo);
    }
    router.refresh();
  }

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
      const body = (await response.json()) as {
        message?: string;
        role?: 'GLOBAL_ADMIN' | 'TENANT_OWNER';
      };

      if (!response.ok) {
        setError(body.message ?? 'Não foi possível entrar agora.');
        return;
      }

      // Ativação de biometria (pedido do cliente) — só faz sentido pra
      // TENANT_OWNER, e só quando a pessoa marcou a caixa. Nunca bloqueia
      // o login se der errado: a conta continua acessível por senha.
      if (
        biometricAvailable &&
        !biometricEnabled &&
        offerBiometricSetup &&
        body.role !== 'GLOBAL_ADMIN'
      ) {
        await registerBiometric();
      }

      redirectAfterLogin(body.role);
    } catch {
      setError('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin(): Promise<void> {
    setError(null);
    setBiometricLoading(true);
    try {
      const result = await loginWithBiometric();
      if (!result.success) {
        setError(result.error ?? 'Não foi possível entrar com biometria.');
        return;
      }
      redirectAfterLogin(undefined);
    } finally {
      setBiometricLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {biometricEnabled ? (
        <>
          <Button onClick={handleBiometricLogin} loading={biometricLoading} className="w-full">
            <Fingerprint className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Entrar com biometria
          </Button>
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <span className="h-px flex-1 bg-ink-secondary/15" />
            ou entre com sua senha
            <span className="h-px flex-1 bg-ink-secondary/15" />
          </div>
        </>
      ) : null}

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

        {biometricAvailable && !biometricEnabled ? (
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={offerBiometricSetup}
              onChange={(event) => setOfferBiometricSetup(event.target.checked)}
              className="h-4 w-4 rounded border-ink-secondary/30"
            />
            Ativar login por biometria neste aparelho
          </label>
        ) : null}

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
    </div>
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
