import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { updateTransaction } from '@/modules/transactions/transaction.service';

const updateTransactionSchema = z.object({
  description: z.string().min(1).optional(),
  amountCents: z.number().int().positive().optional(),
  dueDate: z.coerce.date().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  note: z.string().nullable().optional(),
  reminderEnabled: z.boolean().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    await updateTransaction(access.context.tenantId, params.id, parsed.data);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível editar a transação.';
    return NextResponse.json({ error: 'UPDATE_FAILED', message }, { status: 400 });
  }
}
