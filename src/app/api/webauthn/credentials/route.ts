import { NextResponse } from 'next/server';
import type { WebAuthnCredential } from '@prisma/client';
import { getCurrentSession } from '@/modules/auth/session.service';
import { listWebAuthnCredentials } from '@/modules/webauthn/webauthn.service';

export async function GET(): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const credentials = await listWebAuthnCredentials(session.user.id);
  return NextResponse.json({
    credentials: credentials.map((credential: WebAuthnCredential) => ({
      id: credential.id,
      deviceName: credential.deviceName,
      createdAt: credential.createdAt,
      lastUsedAt: credential.lastUsedAt,
    })),
  });
}
