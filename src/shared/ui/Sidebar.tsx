'use client';

import { CreditCard, Home, LayoutGrid, ListChecks, PieChart, Target } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VortConMark } from '@/shared/design-system/Logo';

const NAV_ITEMS = [
  { href: '/app', label: 'Início', icon: Home },
  { href: '/app/transacoes', label: 'Transações', icon: ListChecks },
  { href: '/app/contas', label: 'Contas', icon: CreditCard },
  { href: '/app/categorias', label: 'Categorias', icon: LayoutGrid },
  { href: '/app/planejamento', label: 'Planejamento', icon: Target },
  { href: '/app/relatorios', label: 'Relatórios', icon: PieChart },
] as const;

/**
 * Sidebar da área autenticada (Seção 15). Navegação reutilizável — qualquer
 * alteração aqui reflete em toda a aplicação. Sem módulo "Cartões": cartão de
 * crédito é apenas uma categoria (Seção 49).
 */
export function Sidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col gap-1 bg-brand-deep px-3 py-5 text-white/90">
      <Link href="/app" className="mb-4 flex items-center gap-2 px-2" aria-label="VortCon — início">
        <VortConMark size={22} />
        <span className="text-base font-extrabold text-white">VortCon</span>
      </Link>

      <nav aria-label="Navegação do aplicativo" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-flow text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto px-2 pt-4 text-[11px] text-white/40">by Belle Planner</p>
    </aside>
  );
}
