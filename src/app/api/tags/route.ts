import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createTag, listTags } from '@/modules/tags/tag.service';

const createTagSchema = z.object({ name: z.string().min(1) });

export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const tags = await listTags(access.context.tenantId);
  return NextResponse.json({ tags });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createTagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const tag = await createTag(access.context.tenantId, parsed.data.name);
  return NextResponse.json({ status: 'ok', id: tag.id });
}
