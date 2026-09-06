import { notFound, redirect } from 'next/navigation';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { findLatestDraft, findPublishedVersion } from '@/modules/legal/legal-document.repository';
import {
  listAcceptanceHistory,
  listAcceptanceOverview,
} from '@/modules/legal/legal-acceptance.service';
import { AdminShell } from '../../AdminShell';
import { AcceptanceOverviewSection } from './AcceptanceOverviewSection';
import { LegalEditor } from './LegalEditor';

export const dynamic = 'force-dynamic';

const SLUG_TO_TYPE = {
  privacidade: { type: 'PRIVACY_POLICY' as const, label: 'Política de Privacidade' },
  termos: { type: 'TERMS_OF_USE' as const, label: 'Termos de Uso' },
};

interface AdminLegalEditorPageProps {
  params: { type: string };
}

export default async function AdminLegalEditorPage({
  params,
}: AdminLegalEditorPageProps): Promise<React.ReactElement> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'FORBIDDEN') redirect('/');

  const meta = SLUG_TO_TYPE[params.type as keyof typeof SLUG_TO_TYPE];
  if (!meta) notFound();

  const [published, draft, overview, history] = await Promise.all([
    findPublishedVersion(meta.type),
    findLatestDraft(meta.type),
    listAcceptanceOverview(meta.type),
    listAcceptanceHistory(meta.type),
  ]);

  return (
    <AdminShell>
      <LegalEditor
        slug={params.type}
        label={meta.label}
        initialContent={draft?.contentHtml ?? published?.contentHtml ?? ''}
        publishedVersion={published?.version ?? null}
      />
      <AcceptanceOverviewSection overview={overview} history={history} />
    </AdminShell>
  );
}
