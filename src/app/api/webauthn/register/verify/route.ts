import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/modules/auth/session.service';
import { verifyRegistration } from '@/modules/webauthn/webauthn.service';

const verifySchema = z.object({
  response: z.unknown(),
  deviceName: z.string().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const result = await verifyRegistration(
    session.user.id,
    parsed.data.response as Parameters<typeof verifyRegistration>[1],
    parsed.data.deviceName,
  );

  if (!result.verified) {
    return NextResponse.json(
      { error: 'VERIFICATION_FAILED', message: result.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ status: 'ok' });
}
