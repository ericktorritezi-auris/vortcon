import { NextResponse } from 'next/server';
import { z } from 'zod';
import { login } from '@/modules/auth/login.service';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const GENERIC_ERROR_MESSAGE = 'Usuário ou senha inválidos.';

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: GENERIC_ERROR_MESSAGE },
      { status: 400 },
    );
  }

  const result = await login(parsed.data.username, parsed.data.password);

  if (result.kind === 'INVALID_CREDENTIALS') {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: GENERIC_ERROR_MESSAGE },
      { status: 401 },
    );
  }

  if (result.kind === 'ACCOUNT_NOT_ACTIVATED') {
    return NextResponse.json(
      {
        error: 'ACCOUNT_NOT_ACTIVATED',
        message: 'Esta conta ainda não foi ativada. Verifique seu e-mail de convite.',
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ status: 'ok', role: result.role });
}
