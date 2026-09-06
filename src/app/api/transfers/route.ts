import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createTransfer } from '@/modules/transfers/transfer.service';

const createTransferSchema = z.object({
  sourceAccountId: z.string().min(1),
  destinationAccountId: z.string().min(1),
  amountCents: z.number().int().positive(),
  scheduledDate: z.coerce.date(),
  note: z.string().optional(),
});

/**
 * Transferência entre contas (Seção 66-68). Confirmada na UI já nasce
 * concluída (settleImmediately: true) — o cliente descreveu o fluxo como
 * "confirmei, transfere na hora, com as respectivas baixas e entradas",
 * não um agendamento pendente.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createTransferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    const transfer = await createTransfer(access.context.tenantId, {
      ...parsed.data,
      settleImmediately: true,
    });
    return NextResponse.json({ status: 'ok', id: transfer.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível criar a transferência.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}
