import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/modules/auth/session.service';
import { deleteWebAuthnCredential } from '@/modules/webauthn/webauthn.service';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  await deleteWebAuthnCredential(session.user.id, params.id);
  return NextResponse.json({ status: 'ok' });
}
