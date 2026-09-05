import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { saveDraft } from '@/modules/legal/legal-document.service';

const draftSchema = z.object({ contentHtml: z.string().min(1) });
const TYPE_PARAM_TO_ENUM = { privacidade: 'PRIVACY_POLICY', termos: 'TERMS_OF_USE' } as const;

export async function POST(
  request: Request,
  { params }: { params: { type: string } },
): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  const documentType = TYPE_PARAM_TO_ENUM[params.type as keyof typeof TYPE_PARAM_TO_ENUM];
  if (!documentType) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const parsed = draftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const draft = await saveDraft(documentType, parsed.data.contentHtml);
  return NextResponse.json({
    status: 'ok',
    version: draft.version,
    contentHtml: draft.contentHtml,
  });
}
