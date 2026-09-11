import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createEntry, listEntriesForMonth } from '@/modules/programming/programming-entry.service';

const createEntrySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  originId: z.string().min(1).optional(),
  beneficiaryId: z.string().min(1),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  entryDate: z.coerce.date(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'from e to são obrigatórios.' },
      { status: 400 },
    );
  }

  const entries = await listEntriesForMonth(access.context.tenantId, new Date(from), new Date(to));
  return NextResponse.json({ entries });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createEntrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  try {
    const entry = await createEntry(access.context.tenantId, parsed.data);
    return NextResponse.json({ status: 'ok', entryId: entry.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível criar o lançamento.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}
