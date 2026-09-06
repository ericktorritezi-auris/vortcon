import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createAccount, listAccounts } from '@/modules/accounts/account.service';

const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CHECKING', 'SAVINGS', 'CASH', 'OTHER']).optional(),
  initialBalanceCents: z.number().int(),
  initialBalanceDate: z.coerce.date(),
});

export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const accounts = await listAccounts(access.context.tenantId);
  return NextResponse.json({ accounts });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  const account = await createAccount(access.context.tenantId, parsed.data);
  return NextResponse.json({ status: 'ok', id: account.id });
}
