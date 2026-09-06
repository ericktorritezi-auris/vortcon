import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deactivateCategory } from '@/modules/categories/category.service';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  await deactivateCategory(access.context.tenantId, params.id);
  return NextResponse.json({ status: 'ok' });
}
