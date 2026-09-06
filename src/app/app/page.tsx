import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { AppShell } from './AppShell';

/**
 * Placeholder do Estágio 4 — o Dashboard real (Seção 81-85) é construído no
 * Estágio 10. Já usa o AppShell (sidebar + topbar) definitivo, para o
 * layout não precisar mudar de novo quando o conteúdo real chegar.
 */
export default async function AppHomePage(): Promise<React.ReactElement> {
  const result = await evaluateAccessPolicy();

  switch (result.kind) {
    case 'UNAUTHENTICATED':
      redirect('/entrar');
    case 'WRONG_AREA_FOR_ADMIN':
      redirect('/admin');
    case 'TENANT_INACTIVE':
      redirect('/inativo');
    case 'DELINQUENCY_BLOCKED':
    case 'ADMIN_BLOCKED':
    case 'SECURITY_BLOCKED':
      redirect('/bloqueado');
    case 'LEGAL_ACCEPTANCE_REQUIRED':
      redirect('/aceitar-termos');
    case 'ALLOWED':
      break;
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="text-2xl font-semibold text-brand-deep">Acesso liberado</h1>
        <p className="max-w-md text-sm text-ink-secondary">
          O Dashboard real chega no Estágio 10. Este placeholder confirma que o AccessPolicyService
          (Seção 29) aprovou o acesso deste tenant.
        </p>
      </div>
    </AppShell>
  );
}
