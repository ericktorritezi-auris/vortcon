import { cookies } from 'next/headers';
import type { ThemePreference } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { env } from '@/shared/config/env';
import {
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_COOKIE_NAME,
  isThemeValue,
  type ThemeValue,
} from './theme.constants';

/**
 * Lê o cookie de tema para o shell autenticado (`AppShell`/`AdminShell`)
 * decidir, já no servidor, se envolve a área logada na classe `dark` —
 * elimina o flash do tema errado sem precisar de nenhum script no client.
 * Seguro chamar aqui: os dois shells já usam `getCurrentSession()` (que já
 * lê cookies) e por isso já são renderizados dinamicamente por requisição;
 * isto não muda a estratégia de renderização de nenhuma página nova, e
 * nunca é chamado fora dessas duas áreas — o site institucional, as
 * páginas legais e a tela de login continuam exatamente como eram.
 */
export function getThemeFromRequestCookie(): ThemeValue {
  const raw = cookies().get(THEME_COOKIE_NAME)?.value;
  return isThemeValue(raw) ? raw : 'light';
}

/**
 * Efeito colateral de HTTP — mesmo padrão de `setSessionCookie` (só chamar
 * de dentro de uma rota de API/Server Action real). Não-HttpOnly de
 * propósito (ver theme.constants.ts).
 */
export function setThemeCookie(theme: ThemeValue): void {
  cookies().set(THEME_COOKIE_NAME, theme, {
    httpOnly: false,
    secure: env.APP_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Conversão pura entre o enum de banco e o valor usado no cookie/DOM —
 * exportada e testada isoladamente (`theme.test.ts`), sem precisar de
 * Prisma nem de `cookies()`. Mesma separação pura/efeito-colateral do
 * módulo `session.service.ts` (Estágio 18).
 */
export function toThemeValue(preference: ThemePreference): ThemeValue {
  return preference === 'DARK' ? 'dark' : 'light';
}

export function toThemePreference(theme: ThemeValue): ThemePreference {
  return theme === 'dark' ? 'DARK' : 'LIGHT';
}

/**
 * Chamada nos três pontos de login (senha, aceite de convite, WebAuthn) —
 * sincroniza o cookie de tema com a preferência salva no usuário, para que
 * a pessoa veja seu tema de sempre mesmo entrando de um navegador/aparelho
 * novo, sem cookie prévio.
 *
 * Não tem teste automatizado direto — assim como `evaluateAccessPolicy`
 * (ver `tests/integration/multitenant-isolation-extended.test.ts`), chama
 * `cookies()` internamente (via `setThemeCookie`), que só funciona dentro
 * de uma requisição real do Next.js; chamar isso num teste Vitest isolado
 * lançaria erro de contexto ausente, não o cenário que queremos provar. A
 * lógica testável foi extraída para `toThemeValue`/`toThemePreference`.
 */
export async function syncThemeCookieFromUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { themePreference: true },
  });
  if (!user) return;
  setThemeCookie(toThemeValue(user.themePreference));
}

/**
 * Persiste a preferência de tema do usuário autenticado. Chamada pela rota
 * de API do toggle (Topbar) — grava em banco (acompanha a pessoa entre
 * dispositivos) e no cookie (efeito imediato no próximo carregamento
 * server-side, sem depender de JS no client ter feito isso a tempo). Mesma
 * limitação de teste direto de `syncThemeCookieFromUser`, acima.
 */
export async function updateThemePreference(userId: string, theme: ThemeValue): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { themePreference: toThemePreference(theme) },
  });
  setThemeCookie(theme);
}
