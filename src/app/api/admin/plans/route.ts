import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { createPlan } from '@/modules/plans/plan.service';

const createPlanSchema = z.object({
  name: z.string().min(1),
  priceCents: z.number().int().positive(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  const parsed = createPlanSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const plan = await createPlan(parsed.data);
  // Nunca devolver o modelo ORM cru (Seção 150) — DTO explícito.
  return NextResponse.json({
    status: 'ok',
    plan: { id: plan.id, name: plan.name, priceCents: plan.priceCents, active: plan.active },
  });
}
