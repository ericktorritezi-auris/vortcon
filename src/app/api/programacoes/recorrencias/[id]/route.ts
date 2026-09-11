import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteProgrammingSeriesWithOccurrences } from '@/modules/programming/programming-recurrence.service';

/** Exclusão em massa (mesmo padrão do domínio financeiro) — preserva ocorrências já convertidas em transação. */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    const result = await deleteProgrammingSeriesWithOccurrences(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a série.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
