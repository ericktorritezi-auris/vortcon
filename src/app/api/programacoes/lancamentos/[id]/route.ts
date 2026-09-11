import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteEntry, updateEntry } from '@/modules/programming/programming-entry.service';

const updateEntrySchema = z.object({
  originId: z.string().min(1).nullable().optional(),
  beneficiaryId: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amountCents: z.number().int().positive().optional(),
  entryDate: z.coerce.date().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    await updateEntry(access.context.tenantId, params.id, parsed.data);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível editar o lançamento.';
    return NextResponse.json({ error: 'UPDATE_FAILED', message }, { status: 400 });
  }
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
    await deleteEntry(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível excluir o lançamento.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
