import { getCurrentSession } from '@/modules/auth/session.service';
import { APP_SHELL_ROOT_ID } from '@/modules/theme/theme.constants';
import { getThemeFromRequestCookie } from '@/modules/theme/theme.service';
import { Sidebar, Topbar } from '@/shared/ui';

/**
 * Shell da área autenticada do tenant — mesma estrutura visual do
 * `AdminShell`, aplicada aqui pra fechar a reestruturação de UX pedida
 * pelo cliente (sidebar + topbar consistentes nas duas áreas).
 *
 * `id={APP_SHELL_ROOT_ID}` + classe `dark` condicional (Estágio 19) — o
 * toggle no Topbar altera esta mesma classe, neste mesmo elemento, no
 * client. O dark mode nunca toca o `<html>` inteiro de propósito: assim
 * ele nunca vaza para o site institucional, páginas legais ou tela de
 * login, mesmo que a pessoa já tenha ativado o tema escuro dentro do app.
 */
export async function AppShell({
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
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar userName={session?.user.name ?? 'Minha conta'} searchScope="tenant" />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
