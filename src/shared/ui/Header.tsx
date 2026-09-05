import Link from 'next/link';
import { VortConMark } from '@/shared/design-system/Logo';
import { Button } from './Button';

/**
 * Header da área pública (Seção 17). O Header da área autenticada vive
 * dentro do shell do Dashboard (Sidebar + top bar), não este componente.
 */
export function Header(): React.ReactElement {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-2" aria-label="VortCon — página inicial">
        <VortConMark size={28} />
        <span className="text-lg font-extrabold tracking-tight text-brand-deep">VortCon</span>
      </Link>

      <nav
        aria-label="Navegação principal"
        className="hidden gap-8 text-sm font-medium text-ink-secondary md:flex"
      >
        <Link href="/produto" className="hover:text-brand-deep">
          Produto
        </Link>
        <Link href="/funcionalidades" className="hover:text-brand-deep">
          Funcionalidades
        </Link>
        <Link href="/planos" className="hover:text-brand-deep">
          Planos
        </Link>
        <Link href="/ajuda" className="hover:text-brand-deep">
          Ajuda
        </Link>
      </nav>

      <Link href="/entrar">
        <Button>Entrar</Button>
      </Link>
    </header>
  );
}
