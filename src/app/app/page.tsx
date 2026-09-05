import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';

/**
 * Placeholder do Estágio 4 — o Dashboard real (Seção 81-85) é construído no
 * Estágio 10. Esta página existe para que o fluxo de autenticação seja
 * demonstrável de ponta a ponta: login/convite/reset já levam a uma rota
 * real, protegida pelo gate completo, não a um link morto.
 */
export default async function AppHomePage(): Promise<React.ReactElement> {
  const result = await evaluateAccessPolicy();

  switch (result.kind) {
    case 'UNAUTHENTICATED':
      redirect('/entrar');
    case 'TENANT_INACTIVE':
      redirect('/inativo');
    case 'DELINQUENCY_BLOCKED':
    case 'ADMIN_BLOCKED':
    case 'SECURITY_BLOCKED':
      redirect('/bloqueado');
    case 'LEGAL_ACCEPTANCE_REQUIRED':
      // Estágio 5 substitui por uma tela real de aceite de termos.
      redirect('/entrar');
    case 'ALLOWED':
      break;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold text-brand-deep">Acesso liberado</h1>
      <p className="max-w-md text-sm text-ink-secondary">
        O Dashboard real chega no Estágio 10. Este placeholder confirma que o AccessPolicyService
        (Seção 29) aprovou o acesso deste tenant.
      </p>
    </main>
  );
}
