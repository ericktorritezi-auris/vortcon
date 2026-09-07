import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/modules/auth/session.service';
import { getRegistrationOptions } from '@/modules/webauthn/webauthn.service';

/** Registro de biometria exige sessão já autenticada — nunca disponível a partir da tela de login em si. */
export async function POST(): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const options = await getRegistrationOptions(
    session.user.id,
    session.user.email,
    session.user.name,
  );
  return NextResponse.json(options);
}
