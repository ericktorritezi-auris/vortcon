import Link from 'next/link';

const APP_VERSION = '1.0.0';

/**
 * Footer global (Seção 16) — componente único, fonte de versão única.
 * Presente em toda página pública e autenticada.
 */
export function Footer(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-secondary/10 px-6 py-6 text-xs text-ink-secondary">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p>
          Desenvolvido por Belle Planner © {year} — Todos os direitos reservados — Versão {APP_VERSION}
        </p>
        <nav aria-label="Links legais" className="flex gap-4">
          <Link href="/legal/privacidade" className="hover:text-ink-primary hover:underline">
            Política de Privacidade
          </Link>
          <Link href="/legal/termos" className="hover:text-ink-primary hover:underline">
            Termos de Uso
          </Link>
        </nav>
      </div>
    </footer>
  );
}
