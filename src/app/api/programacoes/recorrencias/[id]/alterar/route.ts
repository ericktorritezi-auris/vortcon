import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { alterProgrammingSeriesForward } from '@/modules/programming/programming-recurrence.service';

const alterSchema = z.object({
  baseAmountCents: z.number().int().positive().optional(),
  defaultOriginId: z.string().min(1).nullable().optional(),
  defaultBeneficiaryId: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = alterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const result = await alterProgrammingSeriesForward(
      access.context.tenantId,
      params.id,
      parsed.data,
    );
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível alterar a série.';
    return NextResponse.json({ error: 'ALTER_FAILED', message }, { status: 400 });
  }
}
