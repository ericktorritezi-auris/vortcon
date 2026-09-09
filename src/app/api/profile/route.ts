import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/modules/auth/session.service';
import { updateProfile } from '@/modules/auth/profile.service';

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  birthDate: z.coerce.date().nullable().optional(),
  // Seção 208 — sempre um identificador IANA válido; a forma robusta de
  // validar isso em JS é tentar formatar uma data com ele, sem depender
  // de uma lista fixa que ficaria desatualizada.
  timezone: z
    .string()
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Fuso horário inválido.')
    .optional(),
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
