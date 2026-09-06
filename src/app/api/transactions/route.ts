import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';

const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  dueDate: z.coerce.date(),
  accountId: z.string().min(1),
  categoryId: z.string().min(1).optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  note: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  settlementDate: z.coerce.date().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    const transaction = await createIncomeOrExpense(access.context.tenantId, parsed.data);
    return NextResponse.json({ status: 'ok', id: transaction.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível criar a transação.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}
