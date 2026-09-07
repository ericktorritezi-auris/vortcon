import { redirect } from 'next/navigation';
import type { Category, FinancialAccount, Tag } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listAccounts } from '@/modules/accounts/account.service';
import { listCategories } from '@/modules/categories/category.service';
import { listTags } from '@/modules/tags/tag.service';
import { buildReport, resolveReportFilters } from '@/modules/reports/report.service';
import type { ReportSearchParams } from '@/modules/reports/report.service';
import { AppShell } from '../AppShell';
import { ReportsView } from './ReportsView';

export const dynamic = 'force-dynamic';

interface RelatoriosPageProps {
  searchParams: ReportSearchParams;
}

/**
 * Relatórios (Seção 94-101). Filtros completos, sempre agrupado por mês
 * (Seção 94), exportação em PDF (Seção 100) e Excel (Seção 101) — web
 * apenas, mobile é só visualização (Seção 99).
 */
export default async function RelatoriosPage({
  searchParams,
}: RelatoriosPageProps): Promise<React.ReactElement> {
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

  const { filters, summary } = await resolveReportFilters(tenantId, searchParams);

  const [result, categories, accounts, tags] = await Promise.all([
    buildReport(tenantId, filters),
    listCategories(tenantId),
    listAccounts(tenantId),
    listTags(tenantId),
  ]);

  return (
    <AppShell>
      <ReportsView
        result={result}
        filterSummary={summary}
        categories={categories.map((category: Category) => ({
          id: category.id,
          name: category.name,
        }))}
        accounts={accounts.map((account: FinancialAccount) => ({
          id: account.id,
          name: account.name,
        }))}
        tags={tags.map((tag: Tag) => ({ id: tag.id, name: tag.name }))}
        period={{ from: filters.from.toISOString(), to: filters.to.toISOString() }}
        selected={{
          categoria: searchParams.categoria,
          conta: searchParams.conta,
          tag: searchParams.tag,
          status: searchParams.status,
          natureza: searchParams.natureza,
          de: searchParams.de,
          ate: searchParams.ate,
        }}
      />
    </AppShell>
  );
}
