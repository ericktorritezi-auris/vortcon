import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteCategory, updateCategory } from '@/modules/categories/category.service';
import { ICON_KEYS } from '@/shared/design-system/icons';

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  iconKey: z.enum(ICON_KEYS as [string, ...string[]]).optional(),
});

/** Editar nome/ícone (pedido do cliente). */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await updateCategory(access.context.tenantId, params.id, parsed.data);
  return NextResponse.json({ status: 'ok' });
}

/** Exclusão de verdade (pedido do cliente) — só funciona se nada estiver vinculado (deleteCategory garante isso). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await deleteCategory(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível excluir a categoria.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
