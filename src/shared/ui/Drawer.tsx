'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Drawer lateral (Seção 14, 76-79) — usado para lançamento rápido de
 * receita/despesa, especialmente em mobile, onde um Modal centralizado
 * ocupa mal a tela. Mesmo contrato de acessibilidade do Modal.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: DrawerProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    containerRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-ink-secondary/10 px-5 py-4">
          <h2 id="drawer-title" className="text-base font-semibold text-ink-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-ink-secondary hover:bg-surface-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-ink-secondary/10 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
