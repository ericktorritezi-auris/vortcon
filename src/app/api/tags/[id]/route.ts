import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deactivateTag } from '@/modules/tags/tag.service';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  await deactivateTag(access.context.tenantId, params.id);
  return NextResponse.json({ status: 'ok' });
}
