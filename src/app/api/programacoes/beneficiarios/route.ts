import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import {
  createBeneficiary,
  listBeneficiaries,
} from '@/modules/programming/programming-beneficiary.service';

const createBeneficiarySchema = z.object({ name: z.string().min(1) });

export async function GET(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true';
  const beneficiaries = await listBeneficiaries(access.context.tenantId, includeInactive);
  return NextResponse.json({ beneficiaries });
}

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const parsed = createBeneficiarySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const beneficiary = await createBeneficiary(access.context.tenantId, parsed.data.name);
  return NextResponse.json({ status: 'ok', beneficiaryId: beneficiary.id });
}
