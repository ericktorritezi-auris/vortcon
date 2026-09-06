import { FileText, LayoutDashboard, Receipt, Users } from 'lucide-react';
import { getCurrentSession } from '@/modules/auth/session.service';
import { AppSidebar, Topbar } from '@/shared/ui';
import type { AppNavGroup } from '@/shared/ui';

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
 * Shell do Admin — sidebar agrupada + topbar, substituindo o menu
 * horizontal original (reestruturação de UX pedida pelo cliente,
 * comparando com o padrão de referência fornecido).
 */
export async function AdminShell({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getCurrentSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar groups={NAV_GROUPS} homeHref="/admin" brandLabel="Admin" />
      <div className="flex flex-1 flex-col">
        <Topbar userName={session?.user.name ?? 'Administrador'} userSubtitle="Administrador" />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
