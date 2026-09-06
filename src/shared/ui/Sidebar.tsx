'use client';

import { CreditCard, Home, LayoutGrid, ListChecks, PieChart, Target } from 'lucide-react';
import { AppSidebar } from './AppSidebar';

const NAV_GROUPS = [
  {
    items: [
      { href: '/app', label: 'Início', icon: Home },
      { href: '/app/transacoes', label: 'Transações', icon: ListChecks },
      { href: '/app/contas', label: 'Contas', icon: CreditCard },
      { href: '/app/categorias', label: 'Categorias', icon: LayoutGrid },
      { href: '/app/planejamento', label: 'Planejamento', icon: Target },
      { href: '/app/relatorios', label: 'Relatórios', icon: PieChart },
    ],
  },
];

/**
 * Sidebar da área autenticada do tenant (Seção 15) — wrapper fino sobre
 * `AppSidebar` com a navegação do tenant já configurada, para as páginas
 * que já importam `Sidebar` não precisarem mudar nada. Sem módulo
 * "Cartões": cartão de crédito é apenas uma categoria (Seção 49).
 */
export function Sidebar(): React.ReactElement {
  return <AppSidebar groups={NAV_GROUPS} homeHref="/app" />;
}
