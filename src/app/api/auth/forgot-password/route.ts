import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestPasswordReset } from '@/modules/auth/password-reset.service';
import { checkRateLimit, getClientIp } from '@/shared/security/rate-limit';

const forgotPasswordSchema = z.object({ email: z.string().email() });

const GENERIC_MESSAGE =
  'Se existir uma conta correspondente, enviaremos as instruções para recuperação.';

export async function POST(request: Request): Promise<NextResponse> {
  // Seção 153: rate limit em forgot — sem isso, dá pra usar como oráculo de
  // enumeração de e-mails por volume de tentativas, mesmo com resposta genérica.
  const rateLimit = checkRateLimit(`forgot-password:${getClientIp(request)}`, 5, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'E-mail inválido.' },
      { status: 400 },
    );
  }

  // Mesma resposta exista ou não a conta (Seção 27) — nunca aguardar
  // condicionalmente nem variar o corpo/latência de forma observável.
  await requestPasswordReset(parsed.data.email);

  return NextResponse.json({ status: 'ok', message: GENERIC_MESSAGE });
}
