import { prisma } from '@/shared/database/client';
import type { TenantUser, User } from '@prisma/client';
import { materializeAllActiveSeries } from '@/modules/recurrence/recurrence.service';
import { evaluateAndApplyDelinquency } from '@/modules/subscriptions/subscription.service';
import { createNotification } from '@/modules/notifications/notification.service';
import { sendPushToUser } from '@/modules/notifications/push.service';
import { sendSubscriptionOverdueEmail, sendSubscriptionReminderEmail } from '@/shared/email/resend';
import { shouldSuppressReminder } from '@/modules/notifications/notification-suppression';
import { processPendingOutboxEvents } from '@/modules/notifications/outbox.service';
import { runIdempotent } from './job-runner';
import {
  currentHourInTimeZone,
  dateStringToUtcMidnight,
  todayDateStringInTimeZone,
} from './timezone-clock';

const REMINDER_HOUR = 8; // Seção 117 — às 08:00 no timezone do tenant.
const SUBSCRIPTION_REMINDER_DAYS_BEFORE = 3; // Seção 123.

interface TenantOwner {
  tenantId: string;
  userId: string;
  userEmail: string;
  userName: string;
  timezone: string;
}

async function listTenantOwners(): Promise<TenantOwner[]> {
  const memberships = await prisma.tenantUser.findMany({
    where: { tenant: { lifecycle: 'ACTIVE' } },
    include: { user: true },
  });
  return memberships.map((membership: TenantUser & { user: User }) => ({
    tenantId: membership.tenantId,
    userId: membership.user.id,
    userEmail: membership.user.email,
    userName: membership.user.name,
    timezone: membership.user.timezone,
  }));
}

/** RECURRENCE_MATERIALIZATION — a lógica em si já existe desde o Estágio 8; este job só a torna agendável. */
export async function runRecurrenceMaterializationJob(): Promise<void> {
  const owners = await listTenantOwners();
  const today = todayDateStringInTimeZone('UTC');

  for (const owner of owners) {
    await runIdempotent('RECURRENCE_MATERIALIZATION', `${owner.tenantId}:${today}`, () =>
      materializeAllActiveSeries(owner.tenantId),
    );
  }
}

/**
 * FINANCIAL_DUE_REMINDERS (Seção 117-119). Só dispara para quem está às
 * 08h no próprio fuso — não em UTC. Supressão (Seção 118) checada de novo
 * aqui mesmo com o filtro na query, por segurança em camadas. Corpo do
 * push nunca leva valor em reais (Seção 122).
 */
export async function runFinancialDueRemindersJob(): Promise<void> {
  const owners = await listTenantOwners();

  for (const owner of owners) {
    if (currentHourInTimeZone(owner.timezone) !== REMINDER_HOUR) continue;

    const todayDate = dateStringToUtcMidnight(todayDateStringInTimeZone(owner.timezone));

    const dueTransactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: owner.tenantId,
        reminderEnabled: true,
        reminderSentAt: null,
        status: 'PENDING',
        ignored: false,
        dueDate: todayDate,
      },
    });

    for (const transaction of dueTransactions) {
      if (shouldSuppressReminder(transaction)) continue;

      await runIdempotent(
        'FINANCIAL_DUE_REMINDERS',
        `${transaction.id}:${todayDateStringInTimeZone(owner.timezone)}`,
        async () => {
          await createNotification({
            tenantId: owner.tenantId,
            userId: owner.userId,
            type: 'DUE_REMINDER',
            title: transaction.type === 'INCOME' ? 'Recebimento vence hoje' : 'Vencimento hoje',
            body: transaction.description,
            deepLink: '/app/transacoes',
          });
          await sendPushToUser(owner.userId, {
            title: 'VortCon',
            body:
              transaction.type === 'INCOME'
                ? 'Você tem um recebimento previsto para hoje.'
                : 'Você tem um vencimento hoje.',
            deepLink: '/app/transacoes',
          });
          await prisma.financialTransaction.update({
            where: { id: transaction.id },
            data: { reminderSentAt: new Date() },
          });
        },
      );
    }
  }
}

/** SUBSCRIPTION_REMINDERS (Seção 123) — 3 dias antes, interna + Resend + push. */
export async function runSubscriptionRemindersJob(): Promise<void> {
  const owners = await listTenantOwners();

  for (const owner of owners) {
    if (currentHourInTimeZone(owner.timezone) !== REMINDER_HOUR) continue;

    const today = new Date(dateStringToUtcMidnight(todayDateStringInTimeZone(owner.timezone)));
    const targetDueDate = new Date(today);
    targetDueDate.setUTCDate(targetDueDate.getUTCDate() + SUBSCRIPTION_REMINDER_DAYS_BEFORE);

    const charges = await prisma.subscriptionCharge.findMany({
      where: {
        tenantId: owner.tenantId,
        status: 'PENDING',
        reminderSentAt: null,
        dueDate: targetDueDate,
      },
      include: { subscription: { include: { plan: true } } },
    });

    for (const charge of charges) {
      await runIdempotent('SUBSCRIPTION_REMINDERS', `${charge.id}`, async () => {
        const amountFormatted = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(charge.amountCents / 100);
        const dueDateFormatted = new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeZone: 'UTC',
        }).format(charge.dueDate);

        await createNotification({
          tenantId: owner.tenantId,
          userId: owner.userId,
          type: 'SUBSCRIPTION_REMINDER',
          title: 'Mensalidade vence em breve',
          body: `Vence em ${dueDateFormatted}.`,
          deepLink: '/app/assinatura',
        });
        await sendSubscriptionReminderEmail(
          owner.userEmail,
          charge.subscription.plan.name,
          amountFormatted,
          dueDateFormatted,
        );
        await sendPushToUser(owner.userId, {
          title: 'VortCon',
          body: 'Sua mensalidade vence em breve.',
          deepLink: '/app/assinatura',
        });
        await prisma.subscriptionCharge.update({
          where: { id: charge.id },
          data: { reminderSentAt: new Date() },
        });
      });
    }
  }
}

/** SUBSCRIPTION_DELINQUENCY_BLOCK — a lógica em si já existe desde o Estágio 6; este job só a torna agendável. */
export async function runSubscriptionDelinquencyBlockJob(): Promise<void> {
  const owners = await listTenantOwners();
  const today = todayDateStringInTimeZone('UTC');

  for (const owner of owners) {
    await runIdempotent('SUBSCRIPTION_DELINQUENCY_BLOCK', `${owner.tenantId}:${today}`, () =>
      evaluateAndApplyDelinquency(owner.tenantId),
    );
  }
}

/** Aviso pós-vencimento (Seção 123) — único, nunca cobrança diária. Roda junto do job de bloqueio, mesma cadência. */
export async function runSubscriptionOverdueNoticeJob(): Promise<void> {
  const owners = await listTenantOwners();

  for (const owner of owners) {
    const overdueCharges = await prisma.subscriptionCharge.findMany({
      where: { tenantId: owner.tenantId, status: 'PENDING', dueDate: { lt: new Date() } },
      include: { subscription: { include: { plan: true } } },
    });

    for (const charge of overdueCharges) {
      await runIdempotent('SUBSCRIPTION_OVERDUE_NOTICE', charge.id, async () => {
        await createNotification({
          tenantId: owner.tenantId,
          userId: owner.userId,
          type: 'SUBSCRIPTION_OVERDUE',
          title: 'Mensalidade em atraso',
          body: 'Regularize para evitar o bloqueio da sua conta.',
          deepLink: '/app/assinatura',
        });
        await sendSubscriptionOverdueEmail(owner.userEmail, charge.subscription.plan.name);
      });
    }
  }
}

/** MONTH_ROLLOVER — no início do mês, avisa que o resumo do mês anterior está pronto (Seção 89, complementando o Cockpit). */
export async function runMonthRolloverJob(): Promise<void> {
  const owners = await listTenantOwners();
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  for (const owner of owners) {
    await runIdempotent('MONTH_ROLLOVER', `${owner.tenantId}:${monthKey}`, async () => {
      await createNotification({
        tenantId: owner.tenantId,
        userId: owner.userId,
        type: 'MONTH_SUMMARY_READY',
        title: 'Seu resumo financeiro está pronto',
        body: 'Confira o Cockpit do mês anterior.',
        deepLink: '/app/cockpit',
      });
    });
  }
}

/** TOKEN_CLEANUP — remove tokens expirados; nunca acumula lixo indefinidamente. */
export async function runTokenCleanupJob(): Promise<void> {
  const today = todayDateStringInTimeZone('UTC');
  await runIdempotent('TOKEN_CLEANUP', today, async () => {
    const now = new Date();
    const [resetTokens, invitations] = await Promise.all([
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.userInvitation.deleteMany({ where: { expiresAt: { lt: now }, acceptedAt: null } }),
    ]);
    return { resetTokensRemoved: resetTokens.count, invitationsRemoved: invitations.count };
  });
}

/** OUTBOX_PROCESSING — processa o outbox (Seção 126). Roda com frequência maior que os outros. */
export async function runOutboxProcessingJob(): Promise<{ processed: number; failed: number }> {
  return processPendingOutboxEvents();
}

/**
 * BACKUP_MAINTENANCE — registrado aqui de propósito (Seção 127 já prevê o
 * nome do job), mas a funcionalidade real de backup é o Estágio 15, ainda
 * não construído. Sem isso, fingir que este job "funciona" seria pior do
 * que deixá-lo como no-op explícito e documentado.
 */
export async function runBackupMaintenanceJob(): Promise<void> {
  console.warn('[jobs] BACKUP_MAINTENANCE ainda não implementado — aguarda o Estágio 15 (Backup).');
}
