import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAllSeriesForTenant } from '@/modules/recurrence/recurrence.repository';
import { AppShell } from '../AppShell';
import { RecorrenciasManager } from './RecorrenciasManager';

export const dynamic = 'force-dynamic';

/**
 * Gestão de recorrências (pedido do cliente) — ver todas as séries de uma
 * vez, selecionar e excluir em massa. Nunca existia antes: a única forma
 * de mexer numa série recorrente era via API direta.
 */
export default async function RecorrenciasPage(): Promise<React.ReactElement> {
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

  const series = await listAllSeriesForTenant(access.context.tenantId);

  return (
    <AppShell>
      <h1 className="mb-2 text-xl font-semibold text-ink-primary">Recorrências</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Todas as suas transações e transferências recorrentes, num lugar só.
      </p>
      <RecorrenciasManager series={series} />
    </AppShell>
  );
}
