import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { reactivateEntry } from '@/modules/programming/programming-entry.service';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await reactivateEntry(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível reativar.';
    return NextResponse.json({ error: 'REACTIVATE_FAILED', message }, { status: 400 });
  }
}
