/**
 * Nome do cookie de tema (Estágio 19). De propósito NÃO é HttpOnly (ao
 * contrário do cookie de sessão) — precisa ser lido/gravado tanto pelo
 * servidor (RootLayout, no primeiro paint, para nunca haver flash do tema
 * errado) quanto pelo toggle no client, para feedback instantâneo antes
 * mesmo da resposta do servidor confirmar a gravação em banco.
 */
export const THEME_COOKIE_NAME = 'vc-theme';
export const THEME_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // ~13 meses

export type ThemeValue = 'light' | 'dark';

export function isThemeValue(value: unknown): value is ThemeValue {
  return value === 'light' || value === 'dark';
}

/**
 * id do elemento-raiz de `AppShell`/`AdminShell` — é nele, e só nele, que a
 * classe `dark` é aplicada (nunca no `<html>`). `ThemeToggle` usa este
 * mesmo id para alternar a classe no client, então o wrapper e o toggle
 * nunca podem se referir a dois elementos diferentes por acidente.
 */
export const APP_SHELL_ROOT_ID = 'vc-app-shell-root';
