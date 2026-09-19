import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteTransaction, updateTransaction } from '@/modules/transactions/transaction.service';

const updateTransactionSchema = z.object({
  description: z.string().min(1).optional(),
  amountCents: z.number().int().positive().optional(),
  dueDate: z.coerce.date().optional(),
  accountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  note: z.string().nullable().optional(),
  reminderEnabled: z.boolean().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  affectsBalance: z.boolean().optional(),
  // Pedido do cliente (evolução v1.7) — histórico de ajustes de valor
  // (botões +/- da edição, Seção "Histórico do valor"). Cada delta já vem
  // com o sinal certo do client (+ ou -); zero nunca é um ajuste de verdade.
  valueAdjustments: z
    .array(
      z
        .number()
        .int()
        .refine((value) => value !== 0),
    )
    .optional(),
  removeValueAdjustmentIds: z.array(z.string().min(1)).optional(),
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

/** Exclusão de verdade (pedido do cliente) — só funciona se a transação já estiver cancelada (deleteTransaction garante isso). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await deleteTransaction(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível excluir a transação.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
