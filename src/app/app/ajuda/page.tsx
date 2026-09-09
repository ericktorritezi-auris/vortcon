import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { AppShell } from '../AppShell';
import { HelpContent } from './HelpContent';

export const dynamic = 'force-dynamic';

/**
 * Ajuda dentro do painel do tenant (Seção 136, Estágio 16C) — manual de
 * uso passo a passo, cobrindo o mesmo escopo de /funcionalidades mas em
 * formato de referência, não de venda. Sem imagem, só texto — ao
 * contrário das páginas públicas do Estágio 16A.
 */
export default async function AjudaPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();
  if (access.kind === 'UNAUTHENTICATED') redirect('/entrar');
  if (access.kind === 'WRONG_AREA_FOR_ADMIN') redirect('/admin');

  return (
    <AppShell>
      <HelpContent />
    </AppShell>
  );
}
