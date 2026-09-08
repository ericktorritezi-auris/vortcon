'use client';

import {
  ArrowLeftRight,
  CreditCard,
  Gauge,
  Home,
  LayoutGrid,
  ListChecks,
  PieChart,
  Tag,
  Target,
  User,
} from 'lucide-react';
import { AppSidebar } from './AppSidebar';

const NAV_GROUPS = [
  {
    items: [
      { href: '/app', label: 'Início', icon: Home },
      { href: '/app/cockpit', label: 'Cockpit', icon: Gauge },
      { href: '/app/transacoes', label: 'Transações', icon: ListChecks },
      { href: '/app/transferencias', label: 'Transferências', icon: ArrowLeftRight },
      { href: '/app/contas', label: 'Contas', icon: CreditCard },
      { href: '/app/categorias', label: 'Categorias', icon: LayoutGrid },
      { href: '/app/tags', label: 'Tags', icon: Tag },
      { href: '/app/planejamento', label: 'Planejamento', icon: Target },
      { href: '/app/relatorios', label: 'Relatórios', icon: PieChart },
    ],
  },
  {
    items: [{ href: '/app/perfil', label: 'Meu perfil', icon: User }],
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
