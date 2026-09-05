import Link from 'next/link';
import type { ReactNode } from 'react';
import { VortConMark } from '@/shared/design-system/Logo';
import { Footer } from './Footer';

interface AuthCardLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Layout compartilhado das telas públicas de autenticação (Seção 18, 25, 27)
 * — login, aceitar convite, esqueci senha, redefinir senha. Mantém a
 * identidade visual consistente sem repetir a marcação em cada página.
 */
export function AuthCardLayout({
  title,
  description,
  children,
}: AuthCardLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2"
          aria-label="VortCon — página inicial"
        >
          <VortConMark size={30} />
          <span className="text-xl font-extrabold tracking-tight text-brand-deep">VortCon</span>
        </Link>

        <div className="w-full max-w-sm rounded-lg border border-ink-secondary/15 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-ink-primary">{title}</h1>
          {description ? <p className="mb-5 text-sm text-ink-secondary">{description}</p> : null}
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
