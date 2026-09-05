import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/modules/auth/session.service';
import { findPendingAcceptances, recordAcceptance } from '@/modules/legal/legal-acceptance.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const tenant = await tenantRepository.findTenantByUserId(session.userId);
  if (!tenant) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const pending = await findPendingAcceptances(session.userId);

  const evidence = {
    ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  };

  await Promise.all(
    pending.map((item) => recordAcceptance(tenant.id, session.userId, item.versionId, evidence)),
  );

  return NextResponse.json({ status: 'ok' });
}
