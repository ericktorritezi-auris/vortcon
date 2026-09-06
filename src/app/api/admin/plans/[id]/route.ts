import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { deactivatePlan, reactivatePlan } from '@/modules/plans/plan.service';

const patchSchema = z.object({ active: z.boolean() });

export async function PATCH(
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

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const plan = parsed.data.active
    ? await reactivatePlan(params.id)
    : await deactivatePlan(params.id);
  // Nunca devolver o modelo ORM cru (Seção 150) — DTO explícito.
  return NextResponse.json({
    status: 'ok',
    plan: { id: plan.id, name: plan.name, priceCents: plan.priceCents, active: plan.active },
  });
}
