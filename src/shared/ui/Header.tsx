import Link from 'next/link';
import { VortConMark } from '@/shared/design-system/Logo';
import { Button } from './Button';
import { MobileMenu } from './MobileMenu';

const NAV_ITEMS = [
  { href: '/produto', label: 'Produto' },
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/planos', label: 'Planos' },
  { href: '/ajuda', label: 'Ajuda' },
] as const;

/**
 * Header da área pública (Seção 17). O Header da área autenticada vive
 * dentro do shell do Dashboard/Admin (AppSidebar + Topbar), não este
 * componente. `MobileMenu` estava construído desde o Estágio 2 mas nunca
 * conectado — os links simplesmente somiam no mobile, sem substituto
 * nenhum; conectado agora.
 */
export function Header(): React.ReactElement {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2"
        aria-label="VortCon — página inicial"
      >
        <VortConMark size={28} />
        <span className="text-lg font-extrabold tracking-tight text-brand-deep">VortCon</span>
      </Link>

      <nav
        aria-label="Navegação principal"
        className="hidden shrink-0 gap-8 text-sm font-medium text-ink-secondary md:flex"
      >
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-brand-deep">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <MobileMenu items={NAV_ITEMS} />
        <Link href="/entrar">
          <Button>Entrar</Button>
        </Link>
      </div>
    </header>
  );
}
