'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VortConMark } from '@/shared/design-system/Logo';

interface MobileMenuItem {
  href: string;
  label: string;
}

interface MobileMenuProps {
  items: readonly MobileMenuItem[];
}

/**
 * Menu mobile (Seção 15): hamburger + overlay que não desloca o conteúdo da
 * página (posição fixed, não reflow), e fecha automaticamente após seleção.
 */
export function MobileMenu({ items }: MobileMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-md text-brand-deep"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex items-center justify-between px-6 py-5">
            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label="VortCon — página inicial"
            >
              <VortConMark size={26} />
              <span className="text-lg font-extrabold text-brand-deep">VortCon</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="flex h-11 w-11 items-center justify-center rounded-md text-ink-secondary"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Navegação principal" className="flex flex-col gap-1 px-6">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-3 text-base font-medium text-ink-primary hover:bg-surface-page"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
