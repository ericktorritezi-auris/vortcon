import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { completeTransfer } from '@/modules/transfers/transfer.service';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await completeTransfer(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível concluir a transferência.';
    return NextResponse.json({ error: 'SETTLE_FAILED', message }, { status: 400 });
  }
}
