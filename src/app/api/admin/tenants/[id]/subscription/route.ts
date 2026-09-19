import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { updateTenantSubscription } from '@/modules/subscriptions/subscription.service';
import { MAX_DUE_DAY, MIN_DUE_DAY } from '@/modules/subscriptions/billing-dates';

// Edição pelo Admin (evolução v1.7.1, pedido do cliente): Plano, Condição
// (Pagante/Isento) e dia de Vencimento de uma assinatura já existente.
// Todos os campos são opcionais — o form sempre envia os três, mas o schema
// aceita atualização parcial também (mesmo padrão do PATCH de transação).
const updateSubscriptionSchema = z.object({
  planId: z.string().min(1).optional(),
  condition: z.enum(['PAID', 'EXEMPT']).optional(),
  dueDay: z.number().int().min(MIN_DUE_DAY).max(MAX_DUE_DAY).optional(),
});

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

  const parsed = updateSubscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    await updateTenantSubscription(params.id, access.userId, parsed.data);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível atualizar a assinatura.';
    return NextResponse.json({ error: 'UPDATE_FAILED', message }, { status: 400 });
  }
}
