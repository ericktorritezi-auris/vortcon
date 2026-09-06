'use client';

import { Bell, ChevronDown, LogOut, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TopbarProps {
  userName: string;
  userSubtitle?: string;
  searchPlaceholder?: string;
}

/**
 * Topbar compartilhada entre Admin e área do tenant. Busca e notificação
 * são propositalmente "shells visuais" por enquanto — não têm nada de
 * verdade pra buscar ou notificar ainda (busca cruza vários módulos que
 * ainda não existem; notificações reais são o Estágio 13). Desabilitadas
 * de propósito, para não parecer que funcionam e não funcionar. O menu do
 * avatar é o único elemento realmente funcional aqui: mostra quem está
 * logado e faz logout de verdade.
 */
export function Topbar({
  userName,
  userSubtitle,
  searchPlaceholder = 'Buscar...',
}: TopbarProps): React.ReactElement {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/entrar');
    router.refresh();
  }

  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex items-center gap-3 border-b border-ink-secondary/10 bg-white px-4 py-2.5">
      <div className="flex flex-1 items-center gap-2 rounded-md border border-ink-secondary/20 bg-surface-page px-3 py-2 text-sm text-ink-secondary opacity-60">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          disabled
          aria-label={searchPlaceholder}
          className="w-full cursor-not-allowed bg-transparent text-sm text-ink-secondary placeholder:text-ink-secondary focus:outline-none"
        />
      </div>

      <button
        type="button"
        disabled
        aria-label="Notificações — em breve"
        className="flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-ink-secondary/50"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2.5 hover:bg-surface-page"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-flow text-sm font-semibold text-white">
            {initial}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-ink-primary">
              {userName}
            </span>
            {userSubtitle ? (
              <span className="block text-xs leading-tight text-ink-secondary">{userSubtitle}</span>
            ) : null}
          </span>
          <ChevronDown className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-ink-secondary/15 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-page"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
