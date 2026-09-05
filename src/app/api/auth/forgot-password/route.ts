import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requestPasswordReset } from '@/modules/auth/password-reset.service';

const forgotPasswordSchema = z.object({ email: z.string().email() });

const GENERIC_MESSAGE =
  'Se existir uma conta correspondente, enviaremos as instruções para recuperação.';

export async function POST(request: Request): Promise<NextResponse> {
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
