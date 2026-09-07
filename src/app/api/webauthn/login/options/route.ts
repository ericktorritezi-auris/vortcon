import { NextResponse } from 'next/server';
import { getAuthenticationOptions } from '@/modules/webauthn/webauthn.service';

/** Pública — antes do login. allowCredentials vazio, o navegador decide o que oferecer. */
export async function POST(): Promise<NextResponse> {
  const options = await getAuthenticationOptions();
  return NextResponse.json(options);
}
