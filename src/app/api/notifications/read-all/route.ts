import { NextResponse } from 'next/server';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { markAllNotificationsAsRead } from '@/modules/notifications/notification.service';

export async function POST(): Promise<NextResponse> {
  const access = await evaluateAccessPolicy();
  if (access.kind !== 'ALLOWED') {
    return NextResponse.json({ error: access.kind }, { status: 401 });
  }

  await markAllNotificationsAsRead(access.context.userId);
  return NextResponse.json({ status: 'ok' });
}
