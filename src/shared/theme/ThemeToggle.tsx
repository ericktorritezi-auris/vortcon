'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP_SHELL_ROOT_ID } from '@/modules/theme/theme.constants';

/**
 * Toggle de tema claro/escuro (Estágio 19), no dropdown do avatar — ao lado
 * da Calculadora, junto das outras preferências pessoais. Otimista: troca a
 * classe `dark` no elemento-raiz do shell (`AppShell`/`AdminShell`,
 * id={APP_SHELL_ROOT_ID}) e o texto do botão na hora, sem esperar a rede;
 * a chamada à API roda em paralelo só para persistir (banco + cookie), e um
 * eventual erro de rede não desfaz a troca visual — o pior caso é a
 * preferência não acompanhar a pessoa para outro dispositivo até a
 * próxima troca, nunca uma tela que trava ou volta sozinha.
 *
 * De propósito nunca toca no `<html>` inteiro — só no wrapper do shell
 * autenticado, renderizado já com a classe certa pelo servidor (ver
 * `getThemeFromRequestCookie`), então o site institucional e a tela de
 * login nunca herdam o tema escuro. O estado inicial deste botão é lido
 * do próprio DOM (a classe já aplicada pelo servidor), não de uma prop.
 */
export function ThemeToggle({ onToggled }: { onToggled?: () => void }): React.ReactElement {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.getElementById(APP_SHELL_ROOT_ID)?.classList.contains('dark') ?? false);
  }, []);

  async function handleToggle(): Promise<void> {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    document.getElementById(APP_SHELL_ROOT_ID)?.classList.toggle('dark', nextIsDark);
    onToggled?.();

    try {
      await fetch('/api/profile/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextIsDark ? 'dark' : 'light' }),
      });
    } catch {
      // Falha de rede: mantém o tema já aplicado no navegador (ver
      // comentário acima). Nada aqui precisa reverter a UI.
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleToggle}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-page"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      {isDark ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}
