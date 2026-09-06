import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { confirmChecklist } from '@/modules/onboarding/onboarding.service';

export async function POST(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await confirmChecklist(access.context.tenantId);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível confirmar.';
    return NextResponse.json({ error: 'CONFIRM_FAILED', message }, { status: 400 });
  }
}
