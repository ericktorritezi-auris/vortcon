import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { prisma } from '@/shared/database/client';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { appendOutboxEvent } from '@/modules/notifications/outbox.service';
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

  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: params.id },
    include: { user: true },
  });

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tenantRepository.liftBlock(params.blockId, tx);
    if (membership) {
      await appendOutboxEvent(tx, 'TenantUnblocked', {
        tenantId: params.id,
        userId: membership.user.id,
        userEmail: membership.user.email,
      });
    }
  });

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
