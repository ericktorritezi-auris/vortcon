import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import {
  deleteBeneficiary,
  updateBeneficiary,
} from '@/modules/programming/programming-beneficiary.service';

const updateBeneficiarySchema = z.object({ name: z.string().min(1) });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = updateBeneficiarySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await updateBeneficiary(access.context.tenantId, params.id, parsed.data.name);
  return NextResponse.json({ status: 'ok' });
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
    await deleteBeneficiary(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível excluir o beneficiário.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
