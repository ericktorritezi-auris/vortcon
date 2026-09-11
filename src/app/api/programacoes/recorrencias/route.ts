import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import {
  createProgrammingSeries,
  listAllProgrammingSeries,
} from '@/modules/programming/programming-recurrence.service';

const createSeriesSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM_DAYS']),
  interval: z.number().int().positive().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  baseAmountCents: z.number().int().positive(),
  description: z.string().min(1),
  defaultOriginId: z.string().min(1).optional(),
  defaultBeneficiaryId: z.string().min(1),
});

export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const series = await listAllProgrammingSeries(access.context.tenantId);
  return NextResponse.json({ series });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createSeriesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  try {
    const series = await createProgrammingSeries(access.context.tenantId, parsed.data);
    return NextResponse.json({ status: 'ok', seriesId: series.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível criar a recorrência.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}
