import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeInvitation } from '@/modules/auth/invitation.service';
import { createSessionAndSetCookie } from '@/modules/auth/session.service';
import { passwordSchema } from '@/shared/security/password-policy';

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = acceptInviteSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  const result = await consumeInvitation(parsed.data.token, parsed.data.password);

  if (result.kind === 'INVALID_OR_EXPIRED') {
    return NextResponse.json(
      {
        error: 'INVALID_OR_EXPIRED',
        message: 'Este convite é inválido ou expirou. Peça um novo convite.',
      },
      { status: 400 },
    );
  }

  // Ativação já autentica — evita pedir login logo em seguida (Seção 25:
  // "Conta é liberada. Onboarding inicia.").
  await createSessionAndSetCookie(result.userId);

  return NextResponse.json({ status: 'ok' });
}
