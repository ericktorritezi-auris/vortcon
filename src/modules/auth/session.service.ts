import { cookies } from 'next/headers';
import { env } from '@/shared/config/env';
import { generateSecureToken } from '@/shared/security/tokens';
import { SESSION_COOKIE_NAME } from './session.constants';
import * as sessionRepository from './session.repository';

export { SESSION_COOKIE_NAME };
const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias

/**
 * Sessão server-side via cookie (Seção 28). `HttpOnly` sempre; `Secure` em
 * produção; `SameSite=Lax` (protege contra CSRF em navegação cross-site
 * sem quebrar links de e-mail, que usam GET). Nunca em localStorage.
 */
export async function createSessionAndSetCookie(userId: string): Promise<void> {
  const rawToken = generateSecureToken();
  await sessionRepository.createSessionRecord(userId, rawToken);

  cookies().set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.APP_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
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
