import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';

const createTenantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
  planId: z.string().min(1),
  condition: z.enum(['PAID', 'EXEMPT']).default('PAID'),
});

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  const parsed = createTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    const { tenant } = await provisionTenantWithOwner(parsed.data);
    return NextResponse.json({ status: 'ok', tenantId: tenant.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível criar o tenant.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}
