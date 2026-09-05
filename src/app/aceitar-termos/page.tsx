import Link from 'next/link';
import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { findPendingAcceptances } from '@/modules/legal/legal-acceptance.service';
import { AuthCardLayout } from '@/shared/ui';
import { AcceptLegalActions } from './AcceptLegalActions';

export const dynamic = 'force-dynamic';

const DOCUMENT_LABELS: Record<string, { label: string; href: string }> = {
  PRIVACY_POLICY: { label: 'Política de Privacidade', href: '/privacidade' },
  TERMS_OF_USE: { label: 'Termos de Uso', href: '/termos' },
};

/**
 * Gate legal (Seção 135): sem atos obrigatórios, sem Dashboard. Só permite
 * ver os documentos, aceitar, (a ativação já aconteceu antes de chegar
 * aqui) e sair.
 */
export default async function AcceptLegalPage(): Promise<React.ReactElement> {
  const result = await evaluateAccessPolicy();

  if (result.kind === 'ALLOWED') {
    redirect('/app');
  }
  if (result.kind !== 'LEGAL_ACCEPTANCE_REQUIRED') {
    redirect('/entrar');
  }

  const pending = await findPendingAcceptances(result.context.userId);

  return (
    <AuthCardLayout
      title="Antes de continuar"
      description="Atualizamos nossos documentos legais. Revise e aceite para acessar sua conta."
    >
      <ul className="mb-5 flex flex-col gap-2">
        {pending.map((item) => {
          const meta = DOCUMENT_LABELS[item.type];
          return (
            <li key={item.versionId}>
              <Link
                href={meta?.href ?? '#'}
                className="text-sm text-brand-intelligence hover:underline"
              >
                {meta?.label ?? item.type} (versão {item.version})
              </Link>
            </li>
          );
        })}
      </ul>
      <AcceptLegalActions />
    </AuthCardLayout>
  );
}
