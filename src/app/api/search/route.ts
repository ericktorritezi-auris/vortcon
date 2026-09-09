import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { searchTenantData } from '@/modules/search/tenant-search.service';

/** Busca do painel do tenant — tenantId sempre da sessão, nunca de parâmetro. */
export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get('q') ?? '';
  const results = await searchTenantData(access.context.tenantId, query);

  return NextResponse.json({ results });
}
