import { FileWarning } from 'lucide-react';
import { findPublishedVersion } from '@/modules/legal/legal-document.repository';
import { Footer, Header } from '@/shared/ui';

export const dynamic = 'force-dynamic';

export default async function TermsOfUsePage(): Promise<React.ReactElement> {
  const version = await findPublishedVersion('TERMS_OF_USE');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold text-ink-primary">Termos de Uso</h1>
        {version ? (
          <article
            className="prose prose-sm max-w-none text-ink-primary [&_a]:text-brand-intelligence [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-4 [&_ul]:list-disc"
            // eslint-disable-next-line react/no-danger -- conteúdo sanitizado no servidor ao salvar (Seção 130), nunca HTML arbitrário do usuário final
            dangerouslySetInnerHTML={{ __html: version.contentHtml }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-ink-secondary">
            <FileWarning className="h-6 w-6" aria-hidden="true" />
            <p className="text-sm">Este documento ainda não foi publicado.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
