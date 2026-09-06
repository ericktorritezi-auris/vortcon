import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { createCategory, listCategories } from '@/modules/categories/category.service';

const createCategorySchema = z.object({
  name: z.string().min(1),
  iconKey: z.string().min(1).optional(),
});

export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const categories = await listCategories(access.context.tenantId);
  return NextResponse.json({ categories });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createCategorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const category = await createCategory(
    access.context.tenantId,
    parsed.data.name,
    parsed.data.iconKey,
  );
  return NextResponse.json({ status: 'ok', id: category.id });
}
