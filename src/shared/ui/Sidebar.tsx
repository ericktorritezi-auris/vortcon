'use client';

import {
  ArrowLeftRight,
  Building2,
  CreditCard,
  Gauge,
  HelpCircle,
  Home,
  LayoutGrid,
  ListChecks,
  PieChart,
  Repeat,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { AppSidebar } from './AppSidebar';

const NAV_GROUPS = [
  {
    items: [
      { href: '/app', label: 'Início', icon: Home },
      { href: '/app/cockpit', label: 'Cockpit', icon: Gauge },
      { href: '/app/transacoes', label: 'Transações', icon: ListChecks },
      { href: '/app/transferencias', label: 'Transferências', icon: ArrowLeftRight },
      { href: '/app/recorrencias', label: 'Recorrências', icon: Repeat },
      { href: '/app/contas', label: 'Contas', icon: CreditCard },
      { href: '/app/categorias', label: 'Categorias', icon: LayoutGrid },
      { href: '/app/tags', label: 'Tags', icon: Tag },
      { href: '/app/relatorios', label: 'Relatórios', icon: PieChart },
    ],
  },
  {
    // Universo separado do financeiro (evolução v1.2) — PROGRAMAR NÃO É
    // MOVIMENTAR. Grupo próprio de propósito, pra nunca parecer que
    // esses itens fazem parte do domínio financeiro oficial.
    label: 'Programações',
    items: [
      { href: '/app/programacoes/origens', label: 'Origens', icon: Building2 },
      { href: '/app/programacoes/beneficiarios', label: 'Beneficiários', icon: Users },
      { href: '/app/programacoes/lancamentos', label: 'Lançamentos', icon: ListChecks },
      { href: '/app/programacoes/recorrencias', label: 'Recorrências', icon: Repeat },
    ],
  },
  {
    items: [
      { href: '/app/perfil', label: 'Meu perfil', icon: User },
      { href: '/app/ajuda', label: 'Ajuda', icon: HelpCircle },
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
