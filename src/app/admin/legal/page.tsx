import { redirect } from 'next/navigation';
import Link from 'next/link';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { findLatestDraft, findPublishedVersion } from '@/modules/legal/legal-document.repository';
import { Badge } from '@/shared/ui';

export const dynamic = 'force-dynamic';

const DOCUMENTS = [
  { type: 'PRIVACY_POLICY' as const, slug: 'privacidade', label: 'Política de Privacidade' },
  { type: 'TERMS_OF_USE' as const, slug: 'termos', label: 'Termos de Uso' },
];

export default async function AdminLegalIndexPage(): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const rows = await Promise.all(
    DOCUMENTS.map(async (doc) => ({
      ...doc,
      published: await findPublishedVersion(doc.type),
      draft: await findLatestDraft(doc.type),
    })),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Documentos legais</h1>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <Link
            key={row.type}
            href={`/admin/legal/${row.slug}`}
            className="flex items-center justify-between rounded-lg border border-ink-secondary/15 bg-white p-4 hover:border-brand-flow"
          >
            <div>
              <p className="font-medium text-ink-primary">{row.label}</p>
              <p className="text-xs text-ink-secondary">
                {row.published ? `Publicada: versão ${row.published.version}` : 'Nunca publicada'}
              </p>
            </div>
            {row.draft ? <Badge tone="warning">Rascunho pendente</Badge> : null}
          </Link>
        ))}
      </div>
    </main>
  );
}
