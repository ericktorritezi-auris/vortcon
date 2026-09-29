import { redirect } from 'next/navigation';
import type { Category, FinancialAccount } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { listCategories } from '@/modules/categories/category.service';
import { listTransactionsForSimulation } from '@/modules/transactions/transaction.service';
import { resolveMonthPeriod } from '@/shared/period';
import { AppShell } from '../AppShell';
import { SimulationView } from './SimulationView';

export const dynamic = 'force-dynamic';

interface SimulacaoPageProps {
  searchParams: { mes?: string };
}

/**
 * Simulação (evolução v1.8, pedido do cliente) — tela de consulta pura:
 * nunca edita, nunca cria, nunca cancela nada. Filtro sempre por mês
 * (nunca período — diferente de Relatórios/Transações, que aceitam
 * ?de=&ate=; aqui só ?mes=, de propósito). Serve pra montar cenários "se eu
 * pagar/receber tudo isso junto, quanto dá?" sem precisar de planilha.
 */
export default async function SimulacaoPage({
  searchParams,
}: SimulacaoPageProps): Promise<React.ReactElement> {
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
  const period = resolveMonthPeriod({ mes: searchParams.mes });

  const [accounts, categories, transactions] = await Promise.all([
    listAccounts(tenantId),
    listCategories(tenantId),
    listTransactionsForSimulation(tenantId, period.from, period.to),
  ]);

  // Tipo derivado do retorno da própria função (em vez de `Prisma.…GetPayload`)
  // — não depende dos tipos nomeados do `@prisma/client`, que neste sandbox
  // de desenvolvimento ficam genéricos (mesma limitação documentada desde o
  // Estágio 1); no ambiente real (Railway/GitHub Actions) o tipo é o mesmo.
  type SimulationTransactionRow = Awaited<ReturnType<typeof listTransactionsForSimulation>>[number];

  return (
    <AppShell>
      <SimulationView
        transactions={transactions.map((transaction: SimulationTransactionRow) => ({
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          amountCents: transaction.amountCents,
          dueDate: transaction.dueDate,
          categoryId: transaction.categoryId,
          categoryName: transaction.category?.name ?? null,
          accountId: transaction.accountId,
        }))}
        accounts={accounts.map((account: FinancialAccount) => ({
          id: account.id,
          name: account.name,
        }))}
        categories={categories.map((category: Category) => ({
          id: category.id,
          name: category.name,
        }))}
        period={{ from: period.from.toISOString() }}
      />
    </AppShell>
  );
}
