import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { cancelTransaction } from '@/modules/transactions/transaction.service';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await cancelTransaction(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Transação não encontrada.' },
      { status: 404 },
    );
  }
}
