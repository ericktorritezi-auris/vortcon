import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listBeneficiaries } from '@/modules/programming/programming-beneficiary.service';
import { AppShell } from '../../AppShell';
import { BeneficiariesManager } from './BeneficiariesManager';

export const dynamic = 'force-dynamic';

/** Beneficiários (Seções 7-10) — pessoa/empresa relacionada à Programação. Cadastro simples, nunca um CRM. */
export default async function BeneficiariesPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();

  switch (access.kind) {
    case 'UNAUTHENTICATED':
      redirect('/entrar');
    case 'WRONG_AREA_FOR_ADMIN':
      redirect('/admin');
    case 'TENANT_INACTIVE':
      redirect('/inativo');
    case 'DELINQUENCY_BLOCKED':
    case 'ADMIN_BLOCKED':
    case 'SECURITY_BLOCKED':
      redirect('/bloqueado');
    case 'LEGAL_ACCEPTANCE_REQUIRED':
      redirect('/aceitar-termos');
    case 'ALLOWED':
      break;
  }

  const beneficiaries = await listBeneficiaries(access.context.tenantId, true);

  return (
    <AppShell>
      <h1 className="mb-2 text-xl font-semibold text-ink-primary">Programações — Beneficiários</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Pessoa, empresa ou instituição relacionada aos seus lançamentos de Programações.
      </p>
      <BeneficiariesManager
        beneficiaries={beneficiaries.map((b: { id: string; name: string; active: boolean }) => ({
          id: b.id,
          name: b.name,
          active: b.active,
        }))}
      />
    </AppShell>
  );
}
