import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAllSeriesForTenant } from '@/modules/recurrence/recurrence.repository';
import { listAccounts } from '@/modules/accounts/account.service';
import { listCategories } from '@/modules/categories/category.service';
import { AppShell } from '../AppShell';
import { RecorrenciasManager } from './RecorrenciasManager';

export const dynamic = 'force-dynamic';

/**
 * Gestão de recorrências (pedido do cliente) — ver todas as séries de uma
 * vez, selecionar e excluir em massa, e editar cada uma (evolução v1.3,
 * com os dois modos: tudo ou do mês seguinte em diante).
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

  const [series, accounts, categories] = await Promise.all([
    listAllSeriesForTenant(access.context.tenantId),
    listAccounts(access.context.tenantId),
    listCategories(access.context.tenantId),
  ]);

  return (
    <AppShell>
      <h1 className="mb-2 text-xl font-semibold text-ink-primary">Recorrências</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Todas as suas transações e transferências recorrentes, num lugar só.
      </p>
      <RecorrenciasManager
        series={series}
        accounts={accounts.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))}
        categories={categories.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }))}
      />
    </AppShell>
  );
}
