import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { exportTenantBackup } from '@/modules/backup/backup.service';

/** Seção 142 — tenantId sempre resolvido pela sessão, nunca por parâmetro do frontend. */
export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const backup = await exportTenantBackup(access.context.tenantId);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="vortcon-backup-${backup.manifest.generatedAt.slice(0, 10)}.json"`,
    },
  });
}
