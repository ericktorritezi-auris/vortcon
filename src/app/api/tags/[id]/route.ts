import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteTag, updateTag } from '@/modules/tags/tag.service';

const updateTagSchema = z.object({ name: z.string().min(1) });

/** Editar nome (pedido do cliente). */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateTagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await updateTag(access.context.tenantId, params.id, parsed.data.name);
  return NextResponse.json({ status: 'ok' });
}

/** Exclusão de verdade (pedido do cliente) — só funciona se nada estiver vinculado (deleteTag garante isso). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await deleteTag(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a tag.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
