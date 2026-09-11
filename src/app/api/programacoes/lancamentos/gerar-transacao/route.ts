import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { generateTransactionFromEntries } from '@/modules/programming/programming-generation.service';

const generateSchema = z.object({
  beneficiaryId: z.string().min(1),
  type: z.enum(['INCOME', 'EXPENSE']),
  periodFrom: z.coerce.date(),
  periodTo: z.coerce.date(),
  transactionDate: z.coerce.date(),
  accountId: z.string().min(1),
  description: z.string().min(1).optional(),
});

/**
 * O único ponto de contato entre os dois universos (Seções 36-43).
 * Sempre consolida tudo que estiver elegível — nunca seleção parcial
 * (pedido explícito do cliente).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = generateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  try {
    const result = await generateTransactionFromEntries(access.context.tenantId, parsed.data);
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível gerar a transação.';
    return NextResponse.json({ error: 'GENERATE_FAILED', message }, { status: 400 });
  }
}
