import { NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';

/**
 * Healthcheck usado por Railway, CI e smoke tests pós-deploy (Seção 159 e 167).
 * Verifica conectividade real com o PostgreSQL — não apenas se o processo subiu.
 *
 * `force-dynamic` é obrigatório aqui: sem isso, o Next.js tenta pré-renderizar
 * esta rota como estática durante `next build` ("Generating static pages"),
 * o que tenta conectar ao Postgres nesse momento — mas o hostname interno do
 * Railway (`postgres.railway.internal`) só é alcançável em runtime, não
 * durante o build, derrubando o build inteiro. Um healthcheck real também
 * precisa rodar a cada request, nunca servir uma resposta em cache.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        service: 'vortcon',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[healthcheck] falha ao conectar ao banco:', error);

    return NextResponse.json(
      {
        status: 'error',
        service: 'vortcon',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
