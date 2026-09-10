import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createRecurrenceSeries } from '@/modules/recurrence/recurrence.service';
import { listAllSeriesForTenant } from '@/modules/recurrence/recurrence.repository';

const baseSchema = {
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM_DAYS']),
  interval: z.number().int().positive().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  baseAmountCents: z.number().int().positive(),
  description: z.string().min(1).optional(),
};

const transactionSeriesSchema = z.object({
  kind: z.literal('TRANSACTION'),
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  defaultAccountId: z.string().min(1),
  defaultCategoryId: z.string().min(1).optional(),
  defaultReminderEnabled: z.boolean().optional(),
  // Bug real corrigido (pedido do cliente) — antes a série nunca
  // propagava nota nem tags pras ocorrências materializadas.
  defaultNote: z.string().min(1).optional(),
  defaultAffectsBalance: z.boolean().optional(),
  defaultTagIds: z.array(z.string().min(1)).optional(),
  ...baseSchema,
});

const transferSeriesSchema = z.object({
  kind: z.literal('TRANSFER'),
  defaultSourceAccountId: z.string().min(1),
  defaultDestinationAccountId: z.string().min(1),
  ...baseSchema,
});

const createSeriesSchema = z.discriminatedUnion('kind', [
  transactionSeriesSchema,
  transferSeriesSchema,
]);

/**
 * Cria uma série recorrente — transação ou transferência (Estágio 16C,
 * lacuna corrigida: esta rota nunca existiu antes, mesmo o backend de
 * materialização já estando pronto desde o Estágio 8). tenantId sempre da
 * sessão (Seção 142), nunca confiado do corpo da requisição.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createSeriesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  try {
    const series = await createRecurrenceSeries(access.context.tenantId, parsed.data);
    return NextResponse.json({ status: 'ok', seriesId: series.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Não foi possível criar a recorrência.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}

/** Lista todas as séries (ativas e encerradas) — base da tela de gestão de recorrências (pedido do cliente). */
export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const series = await listAllSeriesForTenant(access.context.tenantId);
  return NextResponse.json({ series });
}
