import { redirect } from 'next/navigation';
import type { Tag } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listTags } from '@/modules/tags/tag.service';
import { AppShell } from '../AppShell';
import { TagsManager } from './TagsManager';

export const dynamic = 'force-dynamic';

export default async function TagsPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();

  switch (access.kind) {
    case 'UNAUTHENTICATED':
      redirect('/entrar');
    case 'WRONG_AREA_FOR_ADMIN':
      redirect('/admin');
    case 'TENANT_INACTIVE':
      redirect('/inativo');
    case 'DELINQUENCY_BLOCKED':
    case 'ADMIN_BLOCKED':
    case 'SECURITY_BLOCKED':
      redirect('/bloqueado');
    case 'LEGAL_ACCEPTANCE_REQUIRED':
      redirect('/aceitar-termos');
    case 'ALLOWED':
      break;
  }

  const tags = await listTags(access.context.tenantId);

  return (
    <AppShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Tags</h1>
      <TagsManager tags={tags.map((tag: Tag) => ({ id: tag.id, name: tag.name }))} />
    </AppShell>
  );
}
