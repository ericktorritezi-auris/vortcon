import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { alterProgrammingSeriesForward } from '@/modules/programming/programming-recurrence.service';
import type { AlterProgrammingSeriesMode } from '@/modules/programming/programming-recurrence.service';

const alterSchema = z.object({
  baseAmountCents: z.number().int().positive().optional(),
  defaultOriginId: z.string().min(1).nullable().optional(),
  defaultBeneficiaryId: z.string().min(1).optional(),
  mode: z.enum(['ALL', 'FROM_NEXT_MONTH']).optional(),
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

  const { mode, ...input } = parsed.data;
  const resolvedMode: AlterProgrammingSeriesMode = mode ?? 'FROM_NEXT_MONTH';

  try {
    const result = await alterProgrammingSeriesForward(
      access.context.tenantId,
      params.id,
      input,
      resolvedMode,
    );
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível alterar a série.';
    return NextResponse.json({ error: 'ALTER_FAILED', message }, { status: 400 });
  }
}
