import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { alterRecurrenceForward } from '@/modules/recurrence/recurrence.service';

const alterSchema = z.object({
  baseAmountCents: z.number().int().positive().optional(),
  defaultAccountId: z.string().min(1).optional(),
  defaultCategoryId: z.string().min(1).optional(),
  // Pedido do cliente — propagar (ou remover) a observação pros
  // lançamentos futuros da série. null remove; string troca; ausente não mexe.
  defaultNote: z.string().min(1).nullable().optional(),
  defaultAffectsBalance: z.boolean().optional(),
});

/**
 * "Alterar recorrência" (Seção 73) — muda o padrão da série e as
 * ocorrências futuras ELEGÍVEIS (ainda pendentes, com vencimento no
 * futuro), nunca as já liquidadas/canceladas/históricas.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = alterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  try {
    const result = await alterRecurrenceForward(access.context.tenantId, params.id, parsed.data);
    return NextResponse.json({ status: 'ok', updatedOccurrences: result.updatedOccurrences });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível alterar a recorrência.';
    return NextResponse.json({ error: 'ALTER_FAILED', message }, { status: 400 });
  }
}
