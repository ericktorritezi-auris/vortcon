import { redirect } from 'next/navigation';
import { Target } from 'lucide-react';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { AppShell } from '../AppShell';

export const dynamic = 'force-dynamic';

/**
 * Placeholder honesto — Planejamento ainda não tem estágio construído.
 * Existe aqui só pra o link do menu nunca dar 404; nada fictício é mostrado.
 */
export default async function PlanejamentoPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'WRONG_AREA_FOR_ADMIN') redirect('/admin');

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Target className="h-8 w-8 text-ink-secondary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-ink-primary">Planejamento — em breve</h1>
        <p className="max-w-sm text-sm text-ink-secondary">
          Esta área ainda está sendo construída. Volte em breve.
        </p>
      </div>
    </AppShell>
  );
}
