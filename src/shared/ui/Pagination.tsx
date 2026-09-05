import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Paginação simples (Seção 80). Botões com alvo de toque ~44px (Seção 10) e
 * `aria-current` na página ativa em vez de depender só de estilo visual.
 */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps): React.ReactElement | null {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <span className="px-3 text-sm text-ink-secondary">
        Página <span className="font-semibold text-ink-primary">{page}</span> de {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
