import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumePasswordReset } from '@/modules/auth/password-reset.service';
import { passwordSchema } from '@/shared/security/password-policy';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  const result = await consumePasswordReset(parsed.data.token, parsed.data.password);

  if (result.kind === 'INVALID_OR_EXPIRED') {
    return NextResponse.json(
      {
        error: 'INVALID_OR_EXPIRED',
        message: 'Este link de redefinição é inválido ou expirou. Solicite um novo.',
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ status: 'ok' });
}
