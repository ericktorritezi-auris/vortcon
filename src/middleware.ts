import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/modules/auth/session.constants';

/**
 * Primeira camada de proteção de rotas privadas (Seção 18). Roda em Edge
 * Runtime — checagem barata (cookie existe?), não substitui o
 * `AccessPolicyService` completo (Seção 29), que roda dentro de cada página
 * de `/app` (Node.js runtime, com acesso ao Prisma) e decide lifecycle,
 * bloqueios e aceite legal. Acesso direto por URL nunca contorna nenhuma
 * das duas camadas.
 */
export function middleware(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSession) {
    const loginUrl = new URL('/entrar', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
