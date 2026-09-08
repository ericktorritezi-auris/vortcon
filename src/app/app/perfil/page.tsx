import { redirect } from 'next/navigation';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { getCurrentSession } from '@/modules/auth/session.service';
import { AppShell } from '../AppShell';
import { ProfileView } from './ProfileView';

export const dynamic = 'force-dynamic';

/**
 * Meu Perfil (pedido do cliente) — dados editáveis (nome, telefone, data
 * de nascimento), troca de senha, e gerenciamento de biometria. Nunca
 * email nem username — esses ficam de fora de propósito.
 */
export default async function PerfilPage(): Promise<React.ReactElement> {
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

  const session = await getCurrentSession();
  if (!session) redirect('/entrar');

  return (
    <AppShell>
      <ProfileView
        user={{
          name: session.user.name,
          email: session.user.email,
          username: session.user.username,
          phone: session.user.phone,
          birthDate: session.user.birthDate
            ? session.user.birthDate.toISOString().slice(0, 10)
            : null,
        }}
      />
    </AppShell>
  );
}
