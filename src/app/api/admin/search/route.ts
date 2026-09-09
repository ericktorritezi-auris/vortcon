import { NextResponse } from 'next/server';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { searchTenants } from '@/modules/search/admin-search.service';

/** Busca do painel Admin — escopo restrito a tenants (nunca financeiro). */
export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind === 'UNAUTHENTICATED')
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (access.kind === 'FORBIDDEN')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const query = new URL(request.url).searchParams.get('q') ?? '';
  const results = await searchTenants(query);

  return NextResponse.json({ results });
}
