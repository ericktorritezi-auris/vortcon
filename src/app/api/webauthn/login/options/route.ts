import { NextResponse } from 'next/server';
import { getAuthenticationOptions } from '@/modules/webauthn/webauthn.service';
import { checkRateLimit, getClientIp } from '@/shared/security/rate-limit';

/** Pública — antes do login. allowCredentials vazio, o navegador decide o que oferecer. */
export async function POST(request: Request): Promise<NextResponse> {
  // Seção 153: mesma proteção do login por senha — este é outro caminho de login público.
  const rateLimit = checkRateLimit(`webauthn-login-options:${getClientIp(request)}`, 10, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const options = await getAuthenticationOptions();
  return NextResponse.json(options);
}
