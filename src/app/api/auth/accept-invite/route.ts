import { NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeInvitation } from '@/modules/auth/invitation.service';
import { createSessionAndSetCookie } from '@/modules/auth/session.service';
import { passwordSchema } from '@/shared/security/password-policy';
import { prisma } from '@/shared/database/client';
import { checkRateLimit, getClientIp } from '@/shared/security/rate-limit';

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export async function POST(request: Request): Promise<NextResponse> {
  // Seção 153: rate limit em invite — protege contra força bruta de token.
  const rateLimit = checkRateLimit(`accept-invite:${getClientIp(request)}`, 10, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

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

  // GLOBAL_ADMIN e TENANT_OWNER pousam em áreas diferentes depois de ativar
  // (Seção 22: Admin é separado dos ambientes financeiros) — o client
  // precisa saber o papel para redirecionar para /admin ou /app, nunca
  // sempre para /app (isso derrubava o bootstrap do admin com um erro).
  const user = await prisma.user.findUnique({
    where: { id: result.userId },
    select: { role: true },
  });

  return NextResponse.json({ status: 'ok', role: user?.role ?? 'TENANT_OWNER' });
}
