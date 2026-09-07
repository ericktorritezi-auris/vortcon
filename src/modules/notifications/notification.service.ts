import { prisma } from '@/shared/database/client';
import type { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string;
}

/**
 * Canal "interna" (Seção 116). deepLink é sempre um caminho relativo
 * dentro do próprio app (Seção 120: "deep links contextuais") — nunca uma
 * URL externa arbitrária.
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      deepLink: input.deepLink,
    },
  });
}

const NOTIFICATIONS_PAGE_SIZE = 20;

/** Central de Notificações (Seção 120) — mais recentes primeiro, com contagem de não lidas para o badge do sino. */
export async function listNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATIONS_PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
