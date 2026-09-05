import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '@/modules/auth/session.service';

export async function POST(): Promise<NextResponse> {
  await destroyCurrentSession();
  return NextResponse.json({ status: 'ok' });
}
