import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { buildReport, resolveReportFilters } from '@/modules/reports/report.service';
import { buildReportPdf } from '@/modules/reports/report-pdf';

/**
 * PDF do relatório (Seção 100). Só web — mobile é só visualização (Seção
 * 99); a UI não mostra este botão em telas estreitas, mas a rota em si não
 * bloqueia por user-agent (seria frágil e inconsistente com a regra real).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const { filters, summary } = await resolveReportFilters(access.context.tenantId, params);
  const result = await buildReport(access.context.tenantId, filters);
  const pdfBuffer = await buildReportPdf(result, summary);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="relatorio-vortcon.pdf"',
    },
  });
}
