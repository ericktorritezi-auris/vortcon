import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { recordAuditEvent } from '@/modules/audit/audit.service';

const createBlockSchema = z.object({
  type: z.enum(['ADMINISTRATIVE', 'SECURITY']), // DELINQUENCY é sempre automático (Seção 113)
  reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  const parsed = createBlockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const block = await tenantRepository.createBlock(params.id, parsed.data.type, parsed.data.reason);
  await recordAuditEvent({
    actorType: 'GLOBAL_ADMIN',
    actorId: access.userId,
    tenantId: params.id,
    eventType: 'TENANT_BLOCKED_MANUAL',
    entityType: 'TenantAccessBlock',
    entityId: block.id,
    metadataSanitized: { type: parsed.data.type },
  });

  return NextResponse.json({ status: 'ok' });
}
