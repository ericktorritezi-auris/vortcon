import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionAndSetCookie } from '@/modules/auth/session.service';
import { verifyAuthentication } from '@/modules/webauthn/webauthn.service';

const verifySchema = z.object({ response: z.unknown() });

/**
 * Login por biometria (pedido do cliente). No sucesso, cria a MESMA
 * sessão que o login por senha cria — nenhum caminho paralelo de
 * autenticação, nenhuma lógica de sessão duplicada.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const result = await verifyAuthentication(
    parsed.data.response as Parameters<typeof verifyAuthentication>[0],
  );

  if (!result.verified || !result.userId) {
    return NextResponse.json(
      { error: 'VERIFICATION_FAILED', message: result.error },
      { status: 401 },
    );
  }

  await createSessionAndSetCookie(result.userId);
  return NextResponse.json({ status: 'ok' });
}
