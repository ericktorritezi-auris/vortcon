import { getCurrentSession } from '@/modules/auth/session.service';
import { APP_SHELL_ROOT_ID } from '@/modules/theme/theme.constants';
import { getThemeFromRequestCookie } from '@/modules/theme/theme.service';
import { Topbar } from '@/shared/ui';
import { AdminSidebarNav } from './AdminSidebarNav';

/**
 * Shell do Admin — sidebar agrupada + topbar. A navegação vive em
 * `AdminSidebarNav` (Client Component próprio) de propósito: este arquivo
 * precisa continuar sendo Server Component pra buscar a sessão, e ícones
 * do lucide-react (funções) não podem cruzar a fronteira Server→Client
 * como prop.
 *
 * `id={APP_SHELL_ROOT_ID}` + classe `dark` condicional (Estágio 19) — mesmo
 * mecanismo do `AppShell` do tenant: o toggle no Topbar altera a classe
 * neste mesmo elemento, nunca no `<html>` inteiro.
 */
export async function AdminShell({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getCurrentSession();
  const theme = getThemeFromRequestCookie();

  return (
    <div
      id={APP_SHELL_ROOT_ID}
      className={`flex min-h-screen flex-col md:flex-row ${theme === 'dark' ? 'dark' : ''}`}
    >
      <AdminSidebarNav />
      <div className="flex flex-1 flex-col">
        <Topbar
          userName={session?.user.name ?? 'Administrador'}
          userSubtitle="Administrador"
          searchScope="admin"
        />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
