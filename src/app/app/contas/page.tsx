import { redirect } from 'next/navigation';
import type { FinancialAccount } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { AppShell } from '../AppShell';
import { AccountsManager } from './AccountsManager';

export const dynamic = 'force-dynamic';

export default async function ContasPage(): Promise<React.ReactElement> {
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

  const accounts = await listAccounts(access.context.tenantId);

  return (
    <AppShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Contas</h1>
      <AccountsManager
        accounts={accounts.map((account: FinancialAccount) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          initialBalanceCents: account.initialBalanceCents,
        }))}
      />
    </AppShell>
  );
}
