import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import {
  deleteAccount,
  updateAccount,
  updateInitialBalance,
} from '@/modules/accounts/account.service';

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['CHECKING', 'SAVINGS', 'CASH', 'OTHER']).optional(),
  initialBalanceCents: z.number().int().optional(),
});

/** Editar nome/tipo (pedido do cliente) e/ou saldo inicial — saldo sempre passa por updateInitialBalance (auditoria própria, Seção 157). */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const { name, type, initialBalanceCents } = parsed.data;
    if (name !== undefined || type !== undefined) {
      await updateAccount(access.context.tenantId, params.id, { name, type });
    }
    if (initialBalanceCents !== undefined) {
      await updateInitialBalance(
        access.context.tenantId,
        params.id,
        initialBalanceCents,
        access.context.userId,
      );
    }
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar.';
    return NextResponse.json({ error: 'UPDATE_FAILED', message }, { status: 400 });
  }
}

/** Exclusão de verdade (pedido do cliente) — só funciona se nada estiver vinculado (deleteAccount garante isso). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    await deleteAccount(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a conta.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
