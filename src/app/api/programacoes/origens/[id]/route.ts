import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteOrigin, updateOrigin } from '@/modules/programming/programming-origin.service';

const updateOriginSchema = z.object({ name: z.string().min(1) });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateOriginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await updateOrigin(access.context.tenantId, params.id, parsed.data.name);
  return NextResponse.json({ status: 'ok' });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await deleteOrigin(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a origem.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
