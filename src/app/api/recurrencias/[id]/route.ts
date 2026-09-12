import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteSeriesWithOccurrences } from '@/modules/recurrence/recurrence.service';
import type { DeleteSeriesMode } from '@/modules/recurrence/recurrence.service';

/**
 * Exclusão de série (evolução v1.3) — dois modos, via `?mode=`:
 * `FROM_NEXT_MONTH` (padrão, nunca mexe no mês vigente) ou `ALL` (série
 * inteira, só permitido se nada estiver pago/recebido).
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const modeParam = new URL(request.url).searchParams.get('mode');
  const mode: DeleteSeriesMode = modeParam === 'ALL' ? 'ALL' : 'FROM_NEXT_MONTH';

  try {
    const result = await deleteSeriesWithOccurrences(access.context.tenantId, params.id, mode);
    return NextResponse.json({
      status: 'ok',
      deletedOccurrences: result.deletedOccurrences,
      mode: result.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a série.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
