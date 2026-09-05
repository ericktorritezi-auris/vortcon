import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bootstrapGlobalAdmin } from '@/modules/admin/admin-bootstrap.service';

const bootstrapSchema = z.object({ token: z.string().min(1) });

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bootstrapSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const result = await bootstrapGlobalAdmin(parsed.data.token);

  switch (result.kind) {
    case 'NOT_CONFIGURED':
      return NextResponse.json(
        { error: 'NOT_CONFIGURED', message: 'ADMIN_BOOTSTRAP_TOKEN/EMAIL não configuradas.' },
        { status: 503 },
      );
    case 'INVALID_TOKEN':
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Token inválido.' },
        { status: 401 },
      );
    case 'ALREADY_BOOTSTRAPPED':
      return NextResponse.json(
        { error: 'ALREADY_BOOTSTRAPPED', message: 'Já existe um administrador configurado.' },
        { status: 409 },
      );
    case 'SUCCESS':
      return NextResponse.json({
        status: 'ok',
        message: 'Administrador criado. Verifique o e-mail para ativar.',
      });
  }
}
