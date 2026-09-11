import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createOrigin, listOrigins } from '@/modules/programming/programming-origin.service';

const createOriginSchema = z.object({ name: z.string().min(1) });

export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true';
  const origins = await listOrigins(access.context.tenantId, includeInactive);
  return NextResponse.json({ origins });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createOriginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const origin = await createOrigin(access.context.tenantId, parsed.data.name);
  return NextResponse.json({ status: 'ok', originId: origin.id });
}
