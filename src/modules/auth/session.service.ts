import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { generateSecureToken } from '@/shared/security/tokens';
import { SESSION_COOKIE_NAME } from './session.constants';
import * as sessionRepository from './session.repository';

export { SESSION_COOKIE_NAME };
const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias

/**
 * Cria o registro de sessão no banco e devolve o token bruto (Seção 28).
 * Separado de propósito de `setSessionCookie` (efeito colateral de HTTP,
 * abaixo) — `cookies()` do Next.js só funciona dentro de uma requisição
 * real, e `login()` (que chama esta função) precisa ser testável fora
 * desse contexto. Achado real no Estágio 18: o primeiro CI de verdade
 * rodou `login()` direto de um teste Vitest (sem requisição nenhuma por
 * trás) e `cookies()` lançava "called outside a request scope" — bug
 * pré-existente de um estágio bem anterior, nunca pego até este ambiente
 * ter, pela primeira vez, um Prisma Client de verdade rodando os testes.
 */
export async function createSession(userId: string): Promise<string> {
  const rawToken = generateSecureToken();
  await sessionRepository.createSessionRecord(userId, rawToken);
  return rawToken;
}

/**
 * Efeito colateral de HTTP — só chamar de dentro de uma rota de API ou
 * Server Action de verdade, nunca de um service de lógica de negócio.
 * `HttpOnly` sempre; `Secure` em produção; `SameSite=Lax` (protege contra
 * CSRF em navegação cross-site sem quebrar links de e-mail, que usam GET).
 * Nunca em localStorage.
 */
export function setSessionCookie(rawToken: string): void {
  cookies().set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.APP_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

/** Combinação das duas de cima — conveniência para chamadores que sempre estão em contexto de requisição real (rotas de API). */
export async function createSessionAndSetCookie(userId: string): Promise<void> {
  const rawToken = await createSession(userId);
  setSessionCookie(rawToken);
}

export async function getCurrentSession() {
  const rawToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  return sessionRepository.findValidSessionByToken(rawToken);
}

export async function destroyCurrentSession(): Promise<void> {
  const rawToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    await sessionRepository.revokeSessionByToken(rawToken);
  }
  cookies().delete(SESSION_COOKIE_NAME);
}
