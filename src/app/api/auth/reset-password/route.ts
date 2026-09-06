import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumePasswordReset } from '@/modules/auth/password-reset.service';
import { passwordSchema } from '@/shared/security/password-policy';
import { checkRateLimit, getClientIp } from '@/shared/security/rate-limit';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request): Promise<NextResponse> {
  // Seção 153: rate limit em reset — protege contra força bruta de token.
  const rateLimit = checkRateLimit(`reset-password:${getClientIp(request)}`, 10, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

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
