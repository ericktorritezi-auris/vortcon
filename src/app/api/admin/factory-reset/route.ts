import { NextResponse } from 'next/server';
import { z } from 'zod';
import { executeFactoryReset } from '@/modules/admin/factory-reset.service';
import { checkRateLimit, getClientIp } from '@/shared/security/rate-limit';

const factoryResetSchema = z.object({
  token: z.string().min(1),
  confirmation: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  const rateLimit = checkRateLimit(`factory-reset:${getClientIp(request)}`, 3, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Muitas tentativas. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const parsed = factoryResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const result = await executeFactoryReset(parsed.data.token, parsed.data.confirmation);

  switch (result.kind) {
    case 'NOT_CONFIGURED':
      return NextResponse.json(
        { error: 'NOT_CONFIGURED', message: 'FACTORY_RESET_TOKEN não configurada.' },
        { status: 503 },
      );
    case 'INVALID_TOKEN':
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token inválido.' },
        { status: 401 },
      );
    case 'INVALID_CONFIRMATION':
      return NextResponse.json(
        { error: 'INVALID_CONFIRMATION', message: 'Frase de confirmação incorreta.' },
        { status: 400 },
      );
    case 'ALREADY_USED':
      return NextResponse.json(
        {
          error: 'ALREADY_USED',
          message: 'Este link já foi usado uma vez e não pode ser usado novamente.',
        },
        { status: 409 },
      );
    case 'SUCCESS':
      return NextResponse.json({
        status: 'ok',
        message:
          'Reset concluído. Todos os dados de teste foram apagados. Crie o administrador real em /admin/bootstrap.',
      });
  }
}
