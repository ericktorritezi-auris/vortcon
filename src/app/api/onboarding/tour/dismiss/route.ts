import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { dismissTour } from '@/modules/onboarding/onboarding.service';

export async function POST(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  await dismissTour(access.context.tenantId);
  return NextResponse.json({ status: 'ok' });
}
