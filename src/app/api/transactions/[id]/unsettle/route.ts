import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { unsettleTransaction } from '@/modules/transactions/transaction.service';

/** Reverte pago/recebido -> pendente (Seção 78 estendida a pedido do cliente). */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await unsettleTransaction(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reverter.';
    return NextResponse.json({ error: 'UNSETTLE_FAILED', message }, { status: 400 });
  }
}
