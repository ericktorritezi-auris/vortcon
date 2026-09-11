import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { listOrigins } from '@/modules/programming/programming-origin.service';
import { listBeneficiaries } from '@/modules/programming/programming-beneficiary.service';
import { listEntriesForMonth } from '@/modules/programming/programming-entry.service';
import { resolveMonthPeriod } from '@/shared/period';
import { AppShell } from '../../AppShell';
import { EntriesView } from './EntriesView';
import type { EntryView } from './entry-grouping';

export const dynamic = 'force-dynamic';

interface LancamentosPageProps {
  searchParams: { mes?: string; de?: string; ate?: string };
}

/**
 * Lançamentos de Programações (Seções 12-13) — navegação mensal idêntica
 * à de Transações (mesmo módulo `resolveMonthPeriod`), mas agrupamento
 * por beneficiário fica no client component (Seção 34).
 */
export default async function LancamentosPage({
  searchParams,
}: LancamentosPageProps): Promise<React.ReactElement> {
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

  const { tenantId } = access.context;
  const period = resolveMonthPeriod(searchParams);

  const [rawEntries, origins, beneficiaries, accounts] = await Promise.all([
    listEntriesForMonth(tenantId, period.from, period.to),
    listOrigins(tenantId),
    listBeneficiaries(tenantId),
    listAccounts(tenantId),
  ]);

  const entries: EntryView[] = rawEntries.map((entry: (typeof rawEntries)[number]) => ({
    id: entry.id,
    type: entry.type,
    description: entry.description,
    amountCents: entry.amountCents,
    entryDate: entry.entryDate,
    status: entry.status,
    beneficiaryId: entry.beneficiaryId,
    beneficiaryName: entry.beneficiary.name,
    originName: entry.origin?.name ?? null,
    convertedAt: entry.convertedAt,
    seriesPosition: entry.seriesPosition,
  }));

  return (
    <AppShell>
      <EntriesView
        entries={entries}
        origins={origins.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name }))}
        beneficiaries={beneficiaries.map((b: { id: string; name: string }) => ({
          id: b.id,
          name: b.name,
        }))}
        accounts={accounts.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }))}
        period={{ from: period.from.toISOString(), to: period.to.toISOString() }}
      />
    </AppShell>
  );
}
