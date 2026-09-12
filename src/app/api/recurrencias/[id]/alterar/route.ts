import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { alterRecurrenceForward } from '@/modules/recurrence/recurrence.service';
import type { AlterSeriesMode } from '@/modules/recurrence/recurrence.service';

const alterSchema = z.object({
  baseAmountCents: z.number().int().positive().optional(),
  defaultAccountId: z.string().min(1).optional(),
  defaultCategoryId: z.string().min(1).optional(),
  // Pedido do cliente — propagar (ou remover) a observação pros
  // lançamentos futuros da série. null remove; string troca; ausente não mexe.
  defaultNote: z.string().min(1).nullable().optional(),
  defaultAffectsBalance: z.boolean().optional(),
  // Evolução v1.3 — 'FROM_NEXT_MONTH' (padrão, nunca mexe no mês
  // vigente) ou 'ALL' (edita inclusive passado, só se nada estiver
  // pago/recebido em toda a série).
  mode: z.enum(['ALL', 'FROM_NEXT_MONTH']).optional(),
});

/**
 * "Alterar recorrência" (Seção 73, evolução v1.3) — muda o padrão da
 * série e as ocorrências elegíveis conforme o modo escolhido. Nunca
 * reescreve uma ocorrência liquidada nem cancelada, nos dois modos.
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

  const { mode, ...input } = parsed.data;
  const resolvedMode: AlterSeriesMode = mode ?? 'FROM_NEXT_MONTH';

  try {
    const result = await alterRecurrenceForward(
      access.context.tenantId,
      params.id,
      input,
      resolvedMode,
    );
    return NextResponse.json({
      status: 'ok',
      updatedOccurrences: result.updatedOccurrences,
      mode: result.mode,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível alterar a recorrência.';
    return NextResponse.json({ error: 'ALTER_FAILED', message }, { status: 400 });
  }
}
