import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { unsubscribeFromPush } from '@/modules/notifications/push.service';

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await unsubscribeFromPush(access.context.userId, parsed.data.endpoint);
  return NextResponse.json({ status: 'ok' });
}
