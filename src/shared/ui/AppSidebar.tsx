'use client';

import type { LucideIcon } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VortConMark } from '@/shared/design-system/Logo';

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AppNavGroup {
  /** Rótulo do grupo (título pequeno em maiúscula). Omitir para lista sem agrupamento. */
  label?: string;
  items: AppNavItem[];
}

interface NavLinksProps {
  groups: AppNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}

function NavLinks({ groups, pathname, onNavigate }: NavLinksProps): React.ReactElement {
  return (
    <>
      {groups.map((group, groupIndex) => (
        // eslint-disable-next-line react/no-array-index-key -- grupos sao estaticos, definidos no codigo
        <div key={group.label ?? groupIndex} className="flex flex-col gap-1">
          {group.label ? (
            <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-flow text-white'
                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

interface AppSidebarProps {
  groups: AppNavGroup[];
  homeHref: string;
  brandLabel?: string;
}

/**
 * Sidebar com suporte a agrupamento de seções (padrão de referência
 * fornecido pelo cliente) — usada pela área do tenant e pelo Admin, cada
 * um passando seus próprios grupos. Desktop: fixa à esquerda. Mobile: vira
 * um botão de hambúrguer que abre um overlay de tela cheia com a mesma
 * navegação — a responsividade agora é parte do próprio componente, para
 * nenhuma área nova esquecer de tratar mobile.
 */
export function AppSidebar({
  groups,
  homeHref,
  brandLabel = 'VortCon',
}: AppSidebarProps): React.ReactElement {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <aside className="hidden h-full w-60 shrink-0 flex-col gap-1 overflow-y-auto bg-brand-deep px-3 py-5 text-white/90 md:flex">
        <Link
          href={homeHref}
          className="mb-2 flex items-center gap-2 px-2"
          aria-label={`${brandLabel} — início`}
        >
          <VortConMark size={22} />
          <span className="text-base font-extrabold text-white">{brandLabel}</span>
        </Link>
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          <NavLinks groups={groups} pathname={pathname} />
        </nav>
        <p className="mt-auto px-2 pt-4 text-[11px] text-white/40">by Belle Planner</p>
      </aside>

      <div className="flex items-center border-b border-ink-secondary/10 bg-white px-3 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-md text-brand-deep"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <Link
          href={homeHref}
          className="ml-1 flex items-center gap-2"
          aria-label={`${brandLabel} — início`}
        >
          <VortConMark size={20} />
          <span className="text-sm font-extrabold text-brand-deep">{brandLabel}</span>
        </Link>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-brand-deep px-3 py-5 text-white/90 md:hidden">
          <div className="mb-2 flex items-center justify-between px-2">
            <Link
              href={homeHref}
              className="flex items-center gap-2"
              aria-label={`${brandLabel} — início`}
            >
              <VortConMark size={22} />
              <span className="text-base font-extrabold text-white">{brandLabel}</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="flex h-10 w-10 items-center justify-center rounded-md text-white/80"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Navegação principal" className="flex flex-col gap-1 overflow-y-auto">
            <NavLinks groups={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <p className="mt-auto px-2 pt-4 text-[11px] text-white/40">by Belle Planner</p>
        </div>
      ) : null}
    </>
  );
}
