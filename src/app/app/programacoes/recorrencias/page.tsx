import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAllProgrammingSeries } from '@/modules/programming/programming-recurrence.service';
import { AppShell } from '../../AppShell';
import { ProgrammingRecurrenceManager } from './ProgrammingRecurrenceManager';

export const dynamic = 'force-dynamic';

/**
 * Gestão de Recorrências de Programações (Seções 19-22) — domínio
 * SEPARADO das Recorrências financeiras (Seção 19: "não misturar os dois
 * domínios"). Mesmo conceito de tela, dados completamente isolados.
 */
export default async function ProgrammingRecurrencePage(): Promise<React.ReactElement> {
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

  const series = await listAllProgrammingSeries(access.context.tenantId);

  return (
    <AppShell>
      <h1 className="mb-2 text-xl font-semibold text-ink-primary">Programações — Recorrências</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Todas as suas séries recorrentes de Programações, num lugar só — separado das recorrências
        financeiras.
      </p>
      <ProgrammingRecurrenceManager series={series} />
    </AppShell>
  );
}
