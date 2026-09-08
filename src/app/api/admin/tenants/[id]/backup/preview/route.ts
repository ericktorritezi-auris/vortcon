import { NextResponse } from 'next/server';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { buildBackupPreview, validateBackup } from '@/modules/backup/backup-format';
import type { BackupFile } from '@/modules/backup/backup-format';

/** Seção 145 — validação (versão/tenant/integridade) + preview, antes de qualquer confirmação. */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED')
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (access.kind === 'FORBIDDEN')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const backup = (await request.json().catch(() => null)) as BackupFile | null;
  if (!backup?.manifest || !backup.data) {
    return NextResponse.json(
      { error: 'INVALID_FILE', message: 'Arquivo de backup inválido.' },
      { status: 400 },
    );
  }

  const validation = validateBackup(backup, params.id);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'VALIDATION_FAILED', message: validation.error },
      { status: 400 },
    );
  }

  return NextResponse.json({ status: 'ok', preview: buildBackupPreview(backup) });
}
