import { getCurrentSession } from '@/modules/auth/session.service';
import { Topbar } from '@/shared/ui';
import { AdminSidebarNav } from './AdminSidebarNav';

/**
 * Shell do Admin — sidebar agrupada + topbar. A navegação vive em
 * `AdminSidebarNav` (Client Component próprio) de propósito: este arquivo
 * precisa continuar sendo Server Component pra buscar a sessão, e ícones
 * do lucide-react (funções) não podem cruzar a fronteira Server→Client
 * como prop.
 */
export async function AdminShell({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getCurrentSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebarNav />
      <div className="flex flex-1 flex-col">
        <Topbar userName={session?.user.name ?? 'Administrador'} userSubtitle="Administrador" />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
