import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteProgrammingSeriesWithOccurrences } from '@/modules/programming/programming-recurrence.service';
import type { DeleteProgrammingSeriesMode } from '@/modules/programming/programming-recurrence.service';

/**
 * Exclusão de série (evolução v1.3) — dois modos, via `?mode=`:
 * `FROM_NEXT_MONTH` (padrão) ou `ALL`. Ocorrências já convertidas em
 * transação são sempre preservadas, nos dois modos.
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
  const mode: DeleteProgrammingSeriesMode = modeParam === 'ALL' ? 'ALL' : 'FROM_NEXT_MONTH';

  try {
    const result = await deleteProgrammingSeriesWithOccurrences(
      access.context.tenantId,
      params.id,
      mode,
    );
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a série.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
