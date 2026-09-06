import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AcceptanceContextBannerProps {
  otherDocumentLabel: string;
  otherDocumentHref: string;
}

/**
 * Mostrado só quando a pessoa chegou aqui a partir de `/aceitar-termos`
 * (Seção 135) — sem isso, ler um dos dois documentos antes de aceitar não
 * tinha caminho de volta nem acesso ao outro documento, só o botão "voltar"
 * do navegador. Nunca aparece para quem acessa a página pública normalmente
 * (landing, footer) — lá não faz sentido nenhum contexto de aceite.
 */
export function AcceptanceContextBanner({
  otherDocumentLabel,
  otherDocumentHref,
}: AcceptanceContextBannerProps): React.ReactElement {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-flow/30 bg-brand-flow/5 px-4 py-3 text-sm">
      <Link
        href="/aceitar-termos"
        className="flex items-center gap-1.5 font-medium text-brand-deep hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para aceitar os termos
      </Link>
      <Link
        href={`${otherDocumentHref}?from=aceitar-termos`}
        className="text-brand-intelligence hover:underline"
      >
        Ler também: {otherDocumentLabel}
      </Link>
    </div>
  );
}
