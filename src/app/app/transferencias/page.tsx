import { redirect } from 'next/navigation';
import type { FinancialAccount, Transfer } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { listTransfers } from '@/modules/transfers/transfer.service';
import { AppShell } from '../AppShell';
import { TransfersView } from './TransfersView';

export const dynamic = 'force-dynamic';

export default async function TransferenciasPage(): Promise<React.ReactElement> {
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

  const [accounts, transfers] = await Promise.all([
    listAccounts(tenantId),
    listTransfers(tenantId),
  ]);

  return (
    <AppShell>
      <TransfersView
        transfers={transfers.map((transfer: Transfer) => ({
          id: transfer.id,
          sourceAccountId: transfer.sourceAccountId,
          destinationAccountId: transfer.destinationAccountId,
          amountCents: transfer.amountCents,
          scheduledDate: transfer.scheduledDate,
          status: transfer.status,
          note: transfer.note,
        }))}
        accounts={accounts.map((account: FinancialAccount) => ({
          id: account.id,
          name: account.name,
        }))}
      />
    </AppShell>
  );
}
