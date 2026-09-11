import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listOrigins } from '@/modules/programming/programming-origin.service';
import { AppShell } from '../../AppShell';
import { OriginsManager } from './OriginsManager';

export const dynamic = 'force-dynamic';

/** Origens (Seções 3-6) — cadastro auxiliar do universo de Programações, sem iconografia. */
export default async function OriginsPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();

  switch (access.kind) {
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

  const origins = await listOrigins(access.context.tenantId, true);

  return (
    <AppShell>
      <h1 className="mb-2 text-xl font-semibold text-ink-primary">Programações — Origens</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Cadastro auxiliar (empréstimo, financiamento, repasse...) usado nos lançamentos de
        Programações. Nunca influencia suas finanças oficiais.
      </p>
      <OriginsManager
        origins={origins.map((o: { id: string; name: string; active: boolean }) => ({
          id: o.id,
          name: o.name,
          active: o.active,
        }))}
      />
    </AppShell>
  );
}
