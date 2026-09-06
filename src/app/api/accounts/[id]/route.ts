import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deactivateAccount, updateInitialBalance } from '@/modules/accounts/account.service';

const updateBalanceSchema = z.object({ initialBalanceCents: z.number().int() });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateBalanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    await updateInitialBalance(
      access.context.tenantId,
      params.id,
      parsed.data.initialBalanceCents,
      access.context.userId,
    );
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar.';
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

  await deactivateAccount(access.context.tenantId, params.id);
  return NextResponse.json({ status: 'ok' });
}
