import { NextResponse } from 'next/server';
import { z } from 'zod';
import { evaluateAdminAccess } from '@/modules/admin/admin-access.service';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { validateFirstDueDate } from '@/modules/subscriptions/billing-dates';

// `firstDueDate` (Seção 113, evolução v1.6.1): a data exata da primeira
// cobrança, escolhida pelo Admin — nunca mais um dia-do-mês abstrato
// derivado de "hoje". `validateFirstDueDate` (mesma regra usada dentro de
// `provisionTenantWithOwner`) já bloqueia data passada e dia fora de 1-28
// aqui, na borda da API — defesa em profundidade além da validação do
// serviço.
const createTenantSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    username: z.string().min(3),
    phone: z.string().optional(),
    birthDate: z.coerce.date().optional(),
    timezone: z.string().min(1).default('America/Sao_Paulo'),
    planId: z.string().min(1),
    condition: z.enum(['PAID', 'EXEMPT']).default('PAID'),
    firstDueDate: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    const validation = validateFirstDueDate(data.firstDueDate, new Date());
    if (!validation.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstDueDate'],
        message: validation.error,
      });
    }
  });

export async function POST(request: Request): Promise<NextResponse> {
  const access = await evaluateAdminAccess();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json(
      { error: access.kind },
      { status: access.kind === 'UNAUTHENTICATED' ? 401 : 403 },
    );
  }

  const parsed = createTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const customMessage = parsed.error.issues.find((issue) => issue.code === 'custom')?.message;
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: customMessage ?? 'Dados inválidos.' },
      { status: 400 },
    );
  }

  try {
    const { tenant } = await provisionTenantWithOwner(parsed.data);
    return NextResponse.json({ status: 'ok', tenantId: tenant.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível criar o tenant.';
    return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 400 });
  }
}
