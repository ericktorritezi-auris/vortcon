import { prisma } from '@/shared/database/client';

/**
 * Beneficiário (Seções 7-10) — pessoa/empresa/instituição relacionada à
 * Programação. Cadastro deliberadamente simples (nunca um CRM — Seção 7)
 * — só o nome. Mesmo padrão de `programming-origin.service.ts`.
 */
export async function listBeneficiaries(tenantId: string, includeInactive = false) {
  return prisma.programmingBeneficiary.findMany({
    where: { tenantId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export async function createBeneficiary(tenantId: string, name: string) {
  return prisma.programmingBeneficiary.create({ data: { tenantId, name } });
}

export async function updateBeneficiary(tenantId: string, beneficiaryId: string, name: string) {
  return prisma.programmingBeneficiary.updateMany({
    where: { id: beneficiaryId, tenantId },
    data: { name },
  });
}

export async function deactivateBeneficiary(tenantId: string, beneficiaryId: string) {
  return prisma.programmingBeneficiary.updateMany({
    where: { id: beneficiaryId, tenantId },
    data: { active: false },
  });
}

export async function reactivateBeneficiary(tenantId: string, beneficiaryId: string) {
  return prisma.programmingBeneficiary.updateMany({
    where: { id: beneficiaryId, tenantId },
    data: { active: true },
  });
}

/** Excluir de verdade (Seção 10) — só permitido sem nenhum lançamento vinculado. */
export async function deleteBeneficiary(tenantId: string, beneficiaryId: string): Promise<void> {
  const beneficiary = await prisma.programmingBeneficiary.findFirst({
    where: { id: beneficiaryId, tenantId },
  });
  if (!beneficiary) throw new Error('Beneficiário não encontrado neste tenant.');

  const entryCount = await prisma.programmingEntry.count({ where: { beneficiaryId } });
  if (entryCount > 0) {
    throw new Error('Este beneficiário já tem lançamento vinculado — inative em vez de excluir.');
  }

  await prisma.programmingBeneficiary.delete({ where: { id: beneficiaryId } });
}
