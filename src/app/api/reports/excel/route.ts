import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { buildReport, resolveReportFilters } from '@/modules/reports/report.service';
import { buildReportWorkbook } from '@/modules/reports/report-excel';

export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const { filters, summary } = await resolveReportFilters(access.context.tenantId, params);
  const result = await buildReport(access.context.tenantId, filters);
  const excelBuffer = await buildReportWorkbook(result, summary);

  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="relatorio-vortcon.xlsx"',
    },
  });
}
