import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/modules/auth/session.service';
import { updateProfile } from '@/modules/auth/profile.service';

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  birthDate: z.coerce.date().nullable().optional(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const parsed = updateProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await updateProfile(session.user.id, parsed.data);
  return NextResponse.json({ status: 'ok' });
}
