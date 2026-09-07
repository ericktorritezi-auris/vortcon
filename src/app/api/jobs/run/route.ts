import { NextResponse } from 'next/server';
import {
  runBackupMaintenanceJob,
  runFinancialDueRemindersJob,
  runMonthRolloverJob,
  runOutboxProcessingJob,
  runRecurrenceMaterializationJob,
  runSubscriptionDelinquencyBlockJob,
  runSubscriptionOverdueNoticeJob,
  runSubscriptionRemindersJob,
  runTokenCleanupJob,
} from '@/modules/jobs/jobs.service';

const JOB_HANDLERS: Record<string, () => Promise<unknown>> = {
  RECURRENCE_MATERIALIZATION: runRecurrenceMaterializationJob,
  FINANCIAL_DUE_REMINDERS: runFinancialDueRemindersJob,
  SUBSCRIPTION_REMINDERS: runSubscriptionRemindersJob,
  SUBSCRIPTION_DELINQUENCY_BLOCK: runSubscriptionDelinquencyBlockJob,
  SUBSCRIPTION_OVERDUE_NOTICE: runSubscriptionOverdueNoticeJob,
  MONTH_ROLLOVER: runMonthRolloverJob,
  TOKEN_CLEANUP: runTokenCleanupJob,
  OUTBOX_PROCESSING: runOutboxProcessingJob,
  BACKUP_MAINTENANCE: runBackupMaintenanceJob,
};

/**
 * Disparo de jobs (Seção 127), protegido por segredo compartilhado — só o
 * Railway Cron (ou equivalente) deve chamar isto, nunca exposto sem
 * autenticação. Um job por chamada (`?job=NOME`), pra cada um poder ter sua
 * própria cadência configurada no agendador (lembretes a cada hora, outbox
 * a cada minuto, etc.) sem depender de uma única invocação fazer tudo.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobName = searchParams.get('job');

  const handler = jobName ? JOB_HANDLERS[jobName] : undefined;
  if (!jobName || !handler) {
    return NextResponse.json(
      { error: 'UNKNOWN_JOB', validJobs: Object.keys(JOB_HANDLERS) },
      { status: 400 },
    );
  }

  try {
    const result = await handler();
    return NextResponse.json({ status: 'ok', job: jobName, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida.';
    return NextResponse.json({ error: 'JOB_FAILED', job: jobName, message }, { status: 500 });
  }
}
