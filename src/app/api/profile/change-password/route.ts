import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/modules/auth/session.service';
import { changePassword } from '@/modules/auth/profile.service';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const result = await changePassword(
    session.user.id,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!result.success) {
    return NextResponse.json({ error: 'CHANGE_FAILED', message: result.error }, { status: 400 });
  }

  return NextResponse.json({ status: 'ok' });
}
