import { NextResponse } from 'next/server';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { registerPayment } from '@/modules/subscriptions/subscription.service';

export async function POST(
  _request: Request,
  { params }: { params: { id: string; chargeId: string } },
): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  await registerPayment(params.chargeId, access.userId);
  return NextResponse.json({ status: 'ok' });
}
