import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';

/** Chave pública VAPID (Seção 121) — o navegador precisa dela para chamar `pushManager.subscribe()`. Nunca a privada. */
export async function GET(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'PUSH_NOT_CONFIGURED' }, { status: 503 });
  }

  return NextResponse.json({ publicKey });
}
