import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteTransfer, updateTransfer } from '@/modules/transfers/transfer.service';

const updateTransferSchema = z.object({
  sourceAccountId: z.string().min(1).optional(),
  destinationAccountId: z.string().min(1).optional(),
  amountCents: z.number().int().positive().optional(),
  scheduledDate: z.coerce.date().optional(),
  note: z.string().nullable().optional(),
});

/** Editar (pedido do cliente) — mesma proteção de sempre: nunca aceita tenantId do corpo, sempre da sessão. */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateTransferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    await updateTransfer(access.context.tenantId, params.id, parsed.data);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível editar a transferência.';
    return NextResponse.json({ error: 'UPDATE_FAILED', message }, { status: 400 });
  }
}

/** Exclusão de verdade (pedido do cliente) — só funciona se já estiver cancelada (deleteTransfer garante isso). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await deleteTransfer(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível excluir a transferência.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
