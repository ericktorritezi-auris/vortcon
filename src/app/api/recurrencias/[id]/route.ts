import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { deleteSeriesWithOccurrences } from '@/modules/recurrence/recurrence.service';

/**
 * Exclusão em massa (pedido do cliente: "quero recomeçar do zero, excluir
 * tudo de uma vez"). Exclui a série inteira e TODAS as suas ocorrências,
 * de qualquer status — nunca exige cancelar uma por uma antes, ao
 * contrário de `deleteTransaction`. Ação explícita, só disparada com
 * confirmação clara na tela de gestão de recorrências.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  try {
    const result = await deleteSeriesWithOccurrences(access.context.tenantId, params.id);
    return NextResponse.json({ status: 'ok', deletedOccurrences: result.deletedOccurrences });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível excluir a série.';
    return NextResponse.json({ error: 'DELETE_FAILED', message }, { status: 400 });
  }
}
