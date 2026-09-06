'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AuthCardLayout, Button, Input } from '@/shared/ui';

const CONFIRMATION_PHRASE = 'RESETAR';

/**
 * Estágio 19. Uso único — depois de executado com sucesso, esta página
 * sempre responde "já foi usado" para qualquer tentativa futura, mesmo com
 * o token correto (ver factory-reset.service.ts).
 */
export default function FactoryResetPage(): React.ReactElement {
  const [token, setToken] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/factory-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirmation }),
      });
      const body = (await response.json()) as { message?: string };
      setMessage(
        body.message ?? (response.ok ? 'Concluído.' : 'Não foi possível executar o reset.'),
      );
      setSuccess(response.ok);
    } catch {
      setMessage('Não foi possível executar o reset agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout title="Reset de fábrica" description="Estágio 19 — ação única e irreversível.">
      <div className="mb-5 flex flex-col gap-2 rounded-md border border-financial-danger/30 bg-financial-danger/5 p-3 text-sm">
        <div className="flex items-center gap-2 font-semibold text-financial-danger">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Isto apaga permanentemente:
        </div>
        <ul className="ml-5 list-disc text-ink-secondary">
          <li>Todos os tenants, usuários — inclusive o administrador atual</li>
          <li>Todas as contas, categorias, tags, transações, transferências e recorrências</li>
          <li>Todas as assinaturas, mensalidades, bloqueios e aceites legais</li>
          <li>Todo o histórico de auditoria</li>
        </ul>
        <p className="font-medium text-ink-primary">
          Preservado: o plano comercial e o texto de Política de Privacidade/Termos de Uso.
        </p>
        <p>
          Este link só funciona uma vez. Depois de usado, não funciona nunca mais — nem com o token
          certo.
        </p>
      </div>

      {success ? (
        <p className="text-sm text-ink-primary">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Token"
            name="token"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          <Input
            label={`Digite "${CONFIRMATION_PHRASE}" para confirmar`}
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
          {message ? (
            <p role="alert" className="text-sm font-medium text-financial-danger">
              {message}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="danger"
            loading={loading}
            disabled={confirmation !== CONFIRMATION_PHRASE}
            className="w-full"
          >
            Apagar tudo permanentemente
          </Button>
        </form>
      )}
    </AuthCardLayout>
  );
}
