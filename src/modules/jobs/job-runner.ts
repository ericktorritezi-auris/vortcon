import { prisma } from '@/shared/database/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Idempotência de jobs (Seção 128) — protege contra double-click, retries,
 * worker duplicado e job repetido. A proteção real é a constraint única em
 * (jobName, idempotencyKey): se dois processos tentarem rodar a mesma
 * unidade de trabalho ao mesmo tempo, só o primeiro consegue criar a linha
 * — o segundo recebe violação de unicidade e desiste silenciosamente, sem
 * reprocessar. Nunca uma checagem "SELECT antes, INSERT depois" (isso tem
 * race condition); sempre INSERT direto e trata o erro de duplicidade.
 */
export async function runIdempotent<T>(
  jobName: string,
  idempotencyKey: string,
  fn: () => Promise<T>,
): Promise<{ ran: boolean; result?: T }> {
  let executionId: string;
  try {
    const execution = await prisma.jobExecution.create({
      data: { jobName, idempotencyKey, status: 'RUNNING' },
    });
    executionId = execution.id;
  } catch (error) {
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: unknown }).code
        : undefined;
    if (errorCode === UNIQUE_CONSTRAINT_VIOLATION) {
      return { ran: false };
    }
    throw error;
  }

  try {
    const result = await fn();
    await prisma.jobExecution.update({
      where: { id: executionId },
      data: { status: 'SUCCESS', finishedAt: new Date() },
    });
    return { ran: true, result };
  } catch (error) {
    await prisma.jobExecution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) },
      },
    });
    throw error;
  }
}
