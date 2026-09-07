import webpush from 'web-push';
import type { PushSubscription as PushSubscriptionRecord } from '@prisma/client';
import { prisma } from '@/shared/database/client';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:naoresponda@vortcon.belleplanner.com.br',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

interface SubscribeInput {
  tenantId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Opt-in explícito (Seção 121) — nunca chamado automaticamente; sempre a partir de uma ação do usuário. */
export async function subscribeToPush(input: SubscribeInput) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: input,
    update: { p256dh: input.p256dh, auth: input.auth, lastUsedAt: new Date() },
  });
}

export async function unsubscribeFromPush(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function listPushSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

interface PushPayload {
  title: string;
  body: string;
  deepLink?: string;
}

/**
 * Envia para todos os dispositivos do usuário (Seção 121: multi-
 * dispositivo). Corpo da mensagem sempre discreto (Seção 122: "evitar
 * valores/detalhes excessivos na tela bloqueada") — quem chama é
 * responsável por não colocar valores em reais no body; o padrão de todos
 * os templates deste módulo já segue essa regra. Inscrição expirada/
 * inválida (410/404) é removida silenciosamente — não é erro do usuário, é
 * o navegador tendo revogado a permissão.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[push] VAPID não configurado — envio pulado.');
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.all(
    subscriptions.map(async (subscription: PushSubscriptionRecord) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => undefined);
        } else {
          console.error(`[push] Falha ao enviar para ${subscription.endpoint}:`, error);
        }
      }
    }),
  );
}
