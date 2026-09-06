'use client';

import { FileText, LayoutDashboard, Receipt, Users } from 'lucide-react';
import type { AppNavGroup } from '@/shared/ui';
import { AppSidebar } from '@/shared/ui';

const NAV_GROUPS: AppNavGroup[] = [
  {
    label: 'Visão geral',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Tenants e assinaturas',
    items: [
      { href: '/admin/tenants', label: 'Tenants', icon: Users },
      { href: '/admin/plans', label: 'Planos', icon: Receipt },
    ],
  },
  {
    label: 'Conteúdo',
    items: [{ href: '/admin/legal', label: 'Legal', icon: FileText }],
  },
];

/**
 * Componente cliente separado de propósito: AdminShell precisa continuar
 * sendo Server Component (busca a sessão via getCurrentSession), e
 * componentes de ícone do lucide-react são funções — não podem ser
 * passadas como prop de um Server Component para um Client Component
 * (gera "Functions cannot be passed directly to Client Components" em
 * produção). Definir os grupos aqui, dentro do próprio módulo cliente,
 * evita cruzar essa fronteira.
 */
export function AdminSidebarNav(): React.ReactElement {
  return <AppSidebar groups={NAV_GROUPS} homeHref="/admin" brandLabel="Admin" />;
}
