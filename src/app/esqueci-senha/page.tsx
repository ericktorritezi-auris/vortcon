'use client';

import { useState } from 'react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';

export default function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { message?: string };
      // Mesma mensagem exista ou não a conta (Seção 27) — sempre exibida ao concluir.
      setMessage(
        body.message ??
          'Se existir uma conta correspondente, enviaremos as instruções para recuperação.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <AuthCardLayout title="Verifique seu e-mail">
        <p className="text-sm text-ink-secondary">{message}</p>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="Esqueci minha senha"
      description="Informe seu e-mail para receber as instruções de recuperação."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Enviar instruções
        </Button>
      </form>
    </AuthCardLayout>
  );
}
