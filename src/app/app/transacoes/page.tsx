import { redirect } from 'next/navigation';
import type { Category, FinancialAccount, Tag } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { listCategories } from '@/modules/categories/category.service';
import { listTags } from '@/modules/tags/tag.service';
import { listTransactions } from '@/modules/transactions/transaction.service';
import { getPeriodResult } from '@/modules/financial-engine/financial-engine.service';
import { resolveMonthPeriod } from '@/shared/period';
import { AppShell } from '../AppShell';
import { TransactionsView } from './TransactionsView';

export const dynamic = 'force-dynamic';

interface TransacoesPageProps {
  searchParams: {
    tipo?: string;
    pagina?: string;
    mes?: string;
    de?: string;
    ate?: string;
  };
}

/**
 * Transações — UX (Seção 76-80). Default: mês atual. Subáreas Despesas/
 * Receitas via ?tipo=. Agrupamento por dia e paginação (máx. 15, sem
 * infinite scroll) acontecem no client component, a partir dos dados já
 * paginados vindos daqui.
 */
export default async function TransacoesPage({
  searchParams,
}: TransacoesPageProps): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();

  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'WRONG_AREA_FOR_ADMIN') redirect('/admin');
  if (access.kind === 'TENANT_INACTIVE') redirect('/inativo');
  if (
    access.kind === 'DELINQUENCY_BLOCKED' ||
    access.kind === 'ADMIN_BLOCKED' ||
    access.kind === 'SECURITY_BLOCKED'
  ) {
    redirect('/bloqueado');
  }
  if (access.kind === 'LEGAL_ACCEPTANCE_REQUIRED') redirect('/aceitar-termos');

  const { tenantId } = access.context;
  const period = resolveMonthPeriod(searchParams);
  const type =
    searchParams.tipo === 'despesas'
      ? 'EXPENSE'
      : searchParams.tipo === 'receitas'
        ? 'INCOME'
        : undefined;
  const page = searchParams.pagina ? Number(searchParams.pagina) : 1;

  const [accounts, categories, tags, transactionsPage, periodResultCents] = await Promise.all([
    listAccounts(tenantId),
    listCategories(tenantId),
    listTags(tenantId),
    listTransactions(tenantId, { from: period.from, to: period.to, type, page }),
    getPeriodResult(tenantId, period),
  ]);

  return (
    <AppShell>
      <TransactionsView
        initialData={transactionsPage}
        accounts={accounts.map((account: FinancialAccount) => ({
          id: account.id,
          name: account.name,
        }))}
        categories={categories.map((category: Category) => ({
          id: category.id,
          name: category.name,
          iconKey: category.iconKey,
        }))}
        tags={tags.map((tag: Tag) => ({ id: tag.id, name: tag.name }))}
        period={{ from: period.from.toISOString(), to: period.to.toISOString() }}
        periodResultCents={periodResultCents}
      />
    </AppShell>
  );
}
