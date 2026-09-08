import { NextResponse } from 'next/server';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { restoreTenantBackup } from '@/modules/backup/backup.service';
import type { BackupFile } from '@/modules/backup/backup-format';

/**
 * Restauração (Seção 145) — Admin-only V1, operação destrutiva. A
 * validação (versão/tenant/integridade) já foi feita na prévia, mas é
 * refeita aqui dentro de restoreTenantBackup também — nunca confiar que o
 * cliente chamou /preview antes de chamar /restore.
 */
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

  const result = await restoreTenantBackup(params.id, backup, access.userId);
  if (!result.success) {
    return NextResponse.json({ error: 'RESTORE_FAILED', message: result.error }, { status: 400 });
  }

  return NextResponse.json({ status: 'ok', safetyBackup: result.safetyBackup });
}
