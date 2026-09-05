import { NextResponse } from 'next/server';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { recordAuditEvent } from '@/modules/audit/audit.service';

export async function POST(
  _request: Request,
  { params }: { params: { id: string; blockId: string } },
): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  await tenantRepository.liftBlock(params.blockId);
  await recordAuditEvent({
    actorType: 'GLOBAL_ADMIN',
    actorId: access.userId,
    tenantId: params.id,
    eventType: 'TENANT_UNBLOCKED_MANUAL',
    entityType: 'TenantAccessBlock',
    entityId: params.blockId,
  });

  return NextResponse.json({ status: 'ok' });
}
