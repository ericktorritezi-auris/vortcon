import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { acknowledgeMonth } from '@/modules/cockpit/cockpit.service';

const acknowledgeSchema = z.object({ month: z.coerce.date() });

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = acknowledgeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await acknowledgeMonth(access.context.tenantId, parsed.data.month);
  return NextResponse.json({ status: 'ok' });
}
