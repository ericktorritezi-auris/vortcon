import { getCurrentSession } from '@/modules/auth/session.service';
import { Sidebar, Topbar } from '@/shared/ui';

/**
 * Shell da área autenticada do tenant — mesma estrutura visual do
 * `AdminShell`, aplicada aqui pra fechar a reestruturação de UX pedida
 * pelo cliente (sidebar + topbar consistentes nas duas áreas).
 */
export async function AppShell({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getCurrentSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userName={session?.user.name ?? 'Minha conta'} />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
