import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/modules/auth/session.service';
import { updateThemePreference } from '@/modules/theme/theme.service';

const updateThemeSchema = z.object({
  theme: z.enum(['light', 'dark']),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const parsed = updateThemeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  await updateThemePreference(session.user.id, parsed.data.theme);
  return NextResponse.json({ status: 'ok' });
}
