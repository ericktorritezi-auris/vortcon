import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { createNotification } from './notification.service';
import { sendPaymentConfirmedEmail } from '@/shared/email/resend';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Transactional Outbox simplificado (Seção 126) — nunca Kafka/RabbitMQ.
 * Sempre chamado DENTRO da mesma transação Prisma que a mudança de estado
 * que o originou (ex.: tx.outboxEvent.create junto com
 * tx.subscriptionCharge.update para PAID) — garante que o evento nunca se
 * perde mesmo se o processo cair logo depois do commit.
 */
export async function appendOutboxEvent(
  tx: PrismaTransactionClient,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await tx.outboxEvent.create({
    data: { eventType, payload: payload as Prisma.InputJsonValue },
  });
}

interface SubscriptionChargePaidPayload {
  tenantId: string;
  chargeId: string;
  userId: string;
  userEmail: string;
  planName: string;
  amountFormatted: string;
}

async function dispatchOutboxEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  switch (eventType) {
    case 'SubscriptionChargePaid': {
      const data = payload as unknown as SubscriptionChargePaidPayload;
      await sendPaymentConfirmedEmail(data.userEmail, data.planName, data.amountFormatted);
      await createNotification({
        tenantId: data.tenantId,
        userId: data.userId,
        type: 'PAYMENT_CONFIRMED',
        title: 'Pagamento confirmado',
        body: `Sua mensalidade do plano ${data.planName} foi confirmada.`,
        deepLink: '/app/assinatura',
      });
      return;
    }
    default:
      throw new Error(`Tipo de evento de outbox desconhecido: ${eventType}`);
  }
}

const MAX_BATCH_SIZE = 50;

/**
 * Worker do outbox (Seção 126: "worker processa depois"). Processa em
 * lote, marca cada evento como PROCESSED ou FAILED individualmente — uma
 * falha num evento nunca trava os outros do lote.
 */
export async function processPendingOutboxEvents(): Promise<{ processed: number; failed: number }> {
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: MAX_BATCH_SIZE,
  });

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await dispatchOutboxEvent(event.eventType, event.payload as Record<string, unknown>);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      processed += 1;
    } catch (error) {
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : String(error),
        },
      });
      failed += 1;
    }
  }

  return { processed, failed };
}
