import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { cancelEntry } from '@/modules/programming/programming-entry.service';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  await cancelEntry(access.context.tenantId, params.id);
  return NextResponse.json({ status: 'ok' });
}
