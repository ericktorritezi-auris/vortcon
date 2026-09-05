import { ShieldAlert } from 'lucide-react';
import { Footer } from '@/shared/ui';

/**
 * Tela de bloqueio (Seção 115). Sem ambiente financeiro visível — não
 * distingue o tipo de bloqueio na UI (inadimplência/administrativo/segurança
 * usam a mesma orientação genérica) para não vazar detalhe sensível a quem
 * possa não ser o titular. Dados do tenant são preservados, nunca apagados.
 */
export default function BlockedPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <ShieldAlert className="h-10 w-10 text-financial-warning" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-ink-primary">
          Acesso temporariamente bloqueado
        </h1>
        <p className="max-w-md text-sm text-ink-secondary">
          Sua conta está com o acesso suspenso no momento. Seus dados estão preservados e seguros.
          Entre em contato com o suporte para regularizar sua situação.
        </p>
      </main>
      <Footer />
    </div>
  );
}
