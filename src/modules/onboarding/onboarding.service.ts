import { prisma } from '@/shared/database/client';

export interface OnboardingStep {
  key: 'conta' | 'categoria' | 'primeira_despesa' | 'primeira_receita';
  label: string;
  done: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  tourDismissed: boolean;
  checklistConfirmed: boolean;
}

/**
 * Onboarding (Seção 84-85). Os 4 passos são sempre DERIVADOS dos dados
 * reais do tenant — nunca uma segunda fonte de verdade que poderia
 * dessincronizar (ex.: usuário cria e depois apaga a única conta; o passo
 * "conta" precisa refletir a realidade atual, não um flag congelado).
 */
export async function getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
  const [accountCount, categoryCount, expenseCount, incomeCount, progress] = await Promise.all([
    prisma.financialAccount.count({ where: { tenantId } }),
    prisma.category.count({ where: { tenantId } }),
    prisma.financialTransaction.count({ where: { tenantId, type: 'EXPENSE' } }),
    prisma.financialTransaction.count({ where: { tenantId, type: 'INCOME' } }),
    prisma.onboardingProgress.findUnique({ where: { tenantId } }),
  ]);

  const steps: OnboardingStep[] = [
    { key: 'conta', label: 'Criar sua primeira conta', done: accountCount > 0 },
    { key: 'categoria', label: 'Criar sua primeira categoria', done: categoryCount > 0 },
    { key: 'primeira_despesa', label: 'Registrar sua primeira despesa', done: expenseCount > 0 },
    { key: 'primeira_receita', label: 'Registrar sua primeira receita', done: incomeCount > 0 },
  ];

  const completedCount = steps.filter((step) => step.done).length;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    isComplete: completedCount === steps.length,
    tourDismissed: progress?.tourDismissedAt != null,
    checklistConfirmed: progress?.checklistConfirmedAt != null,
  };
}

async function ensureProgressRow(tenantId: string) {
  return prisma.onboardingProgress.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

/** Tour pode ser pulado (Seção 85) — dispensa persistida, nunca reaparece depois. */
export async function dismissTour(tenantId: string): Promise<void> {
  await ensureProgressRow(tenantId);
  await prisma.onboardingProgress.update({
    where: { tenantId },
    data: { tourDismissedAt: new Date() },
  });
}

/**
 * "Após 100%: confirmação. Depois desaparece permanentemente" (Seção 85).
 * Só permite confirmar quando os 4 passos já estão de fato completos —
 * evita um card "confirmado" mentindo sobre progresso que não existiu.
 */
export async function confirmChecklist(tenantId: string): Promise<void> {
  const status = await getOnboardingStatus(tenantId);
  if (!status.isComplete) {
    throw new Error('Ainda há passos pendentes no checklist de primeiros passos.');
  }

  await ensureProgressRow(tenantId);
  await prisma.onboardingProgress.update({
    where: { tenantId },
    data: { checklistConfirmedAt: new Date() },
  });
}
