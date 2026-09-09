'use client';

import { ChevronDown, LogOut, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { NotificationBell } from './NotificationBell';

interface TopbarProps {
  userName: string;
  userSubtitle?: string;
  searchPlaceholder?: string;
  /** Admin busca só tenants (nunca financeiro); tenant busca o próprio dado (Estágio 18 — antes era um shell visual desabilitado de propósito). */
  searchScope: 'admin' | 'tenant';
}

interface NormalizedResult {
  key: string;
  primaryLabel: string;
  secondaryLabel: string;
  href: string;
}

interface TenantSearchApiResult {
  type: string;
  label: string;
  detail: string;
  href: string;
}

interface AdminSearchApiResult {
  tenantId: string;
  ownerName: string;
  ownerEmail: string;
  href: string;
}

const TYPE_LABEL: Record<string, string> = {
  transacao: 'Transação',
  conta: 'Conta',
  categoria: 'Categoria',
  tag: 'Tag',
};

/**
 * Topbar compartilhada entre Admin e área do tenant. Notificações (Seção
 * 120, Estágio 13) e o menu do avatar sempre foram reais; a busca virou
 * real agora (Estágio 18) — antes era um shell visual desabilitado de
 * propósito, porque na reestruturação de UX (Estágios 8-9) os módulos que
 * ela cruzaria ainda não existiam. Escopo nunca é o mesmo pros dois
 * papéis: Admin busca só tenant (nome/e-mail/usuário do dono), nunca
 * dado financeiro; tenant busca só o próprio dado (Seção 142 — tenantId
 * sempre da sessão, nunca aceito do cliente).
 */
export function Topbar({
  userName,
  userSubtitle,
  searchPlaceholder = 'Buscar...',
  searchScope,
}: TopbarProps): React.ReactElement {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NormalizedResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const endpoint = searchScope === 'admin' ? '/api/admin/search' : '/api/search';
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          setResults([]);
          return;
        }
        const body = (await response.json()) as {
          results: TenantSearchApiResult[] | AdminSearchApiResult[];
        };

        const normalized: NormalizedResult[] =
          searchScope === 'admin'
            ? (body.results as AdminSearchApiResult[]).map((result) => ({
                key: result.tenantId,
                primaryLabel: result.ownerName,
                secondaryLabel: result.ownerEmail,
                href: result.href,
              }))
            : (body.results as TenantSearchApiResult[]).map((result, index) => ({
                key: `${result.type}-${index}-${result.label}`,
                primaryLabel: result.label,
                secondaryLabel: `${TYPE_LABEL[result.type] ?? result.type} · ${result.detail}`,
                href: result.href,
              }));

        setResults(normalized);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchScope]);

  function handleSelectResult(href: string): void {
    setSearchOpen(false);
    setQuery('');
    router.push(href);
  }

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/entrar');
    router.refresh();
  }

  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex items-center gap-3 border-b border-ink-secondary/10 bg-white px-4 py-2.5">
      <div ref={containerRef} className="relative flex-1">
        <div className="flex items-center gap-2 rounded-md border border-ink-secondary/20 bg-surface-page px-3 py-2 text-sm text-ink-secondary">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            aria-label={searchPlaceholder}
            className="w-full bg-transparent text-sm text-ink-primary placeholder:text-ink-secondary focus:outline-none"
          />
        </div>

        {searchOpen && query.trim().length >= 2 ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-ink-secondary/15 bg-white py-1 shadow-lg">
            {loading ? (
              <p className="px-3 py-2 text-sm text-ink-secondary">Buscando...</p>
            ) : results.length > 0 ? (
              results.map((result) => (
                <button
                  key={result.key}
                  type="button"
                  onClick={() => handleSelectResult(result.href)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-page"
                >
                  <span className="text-sm text-ink-primary">{result.primaryLabel}</span>
                  <span className="text-xs text-ink-secondary">{result.secondaryLabel}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-ink-secondary">Nenhum resultado.</p>
            )}
          </div>
        ) : null}
      </div>

      <NotificationBell />

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
