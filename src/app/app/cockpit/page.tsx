import { redirect } from 'next/navigation';
import type { Category } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listCategories } from '@/modules/categories/category.service';
import {
  getCockpitSummary,
  findUnacknowledgedPreviousMonth,
} from '@/modules/cockpit/cockpit.service';
import { resolveMonthPeriod } from '@/shared/period';
import { AppShell } from '../AppShell';
import { CockpitView } from './CockpitView';

export const dynamic = 'force-dynamic';

interface CockpitPageProps {
  searchParams: {
    mes?: string;
  };
}

/**
 * Cockpit (Seção 86-90) — resumo mensal analítico. Default: mês atual.
 * Sempre recomputado ao vivo (Seção 88), nunca um snapshot salvo.
 */
export default async function CockpitPage({
  searchParams,
}: CockpitPageProps): Promise<React.ReactElement> {
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

  const [summary, categories, unacknowledgedMonth] = await Promise.all([
    getCockpitSummary(tenantId, period.from),
    listCategories(tenantId),
    findUnacknowledgedPreviousMonth(tenantId),
  ]);

  return (
    <AppShell>
      <CockpitView
        summary={summary}
        categories={categories.map((category: Category) => ({
          id: category.id,
          name: category.name,
        }))}
        period={{ from: period.from.toISOString(), to: period.to.toISOString() }}
        unacknowledgedMonth={unacknowledgedMonth ? unacknowledgedMonth.toISOString() : null}
      />
    </AppShell>
  );
}
