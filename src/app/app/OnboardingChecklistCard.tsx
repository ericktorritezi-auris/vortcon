'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/shared/ui';
import type { OnboardingStatus } from '@/modules/onboarding/onboarding.service';

interface OnboardingChecklistCardProps {
  status: OnboardingStatus;
}

/**
 * "Primeiros Passos" (Seção 85) — card persistente até ser confirmado.
 * Ao chegar em 100%, mostra o botão de confirmação; depois de confirmado,
 * some permanentemente (o próprio server component não renderiza mais
 * este card quando checklistConfirmed vem true).
 */
export function OnboardingChecklistCard({
  status,
}: OnboardingChecklistCardProps): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleConfirm(): Promise<void> {
    setLoading(true);
    try {
      await fetch('/api/onboarding/checklist/confirm', { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-brand-flow/30 bg-brand-flow/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-primary">Primeiros passos</h2>
        <span className="text-xs font-medium text-ink-secondary">
          {status.completedCount}/{status.totalSteps}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {status.steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            {step.done ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-financial-success"
                aria-hidden="true"
              />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-secondary/40" aria-hidden="true" />
            )}
            <span className={step.done ? 'text-ink-secondary line-through' : 'text-ink-primary'}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
      {status.isComplete ? (
        <Button onClick={handleConfirm} loading={loading} size="sm" className="mt-3">
          Concluir
        </Button>
      ) : null}
    </section>
  );
}
