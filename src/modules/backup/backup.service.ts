import { prisma } from '@/shared/database/client';
import type {
  Category,
  FinancialAccount,
  FinancialTransaction,
  FinancialTransactionTag,
  Prisma,
  RecurrenceSeries,
  Tag,
  Transfer,
} from '@prisma/client';
import { recordAuditEvent } from '@/modules/audit/audit.service';
import type { BackupData, BackupFile } from './backup-format';
import { BACKUP_MANIFEST_VERSION, computeBackupChecksum, validateBackup } from './backup-format';

const VORTCON_VERSION = '1.2.0';

/**
 * Exportação (Seção 142-144). tenantId sempre vem do backend (sessão do
 * usuário ou tenant já validado pelo Admin) — nunca de um parâmetro
 * confiado do frontend. Só o conteúdo da Seção 143 é incluído — nunca
 * senha, sessão, token, segredo, ou dado de outro tenant.
 */
export async function exportTenantBackup(tenantId: string): Promise<BackupFile> {
  const [accounts, categories, tags, recurrenceSeries, transactions, transfers] = await Promise.all(
    [
      prisma.financialAccount.findMany({ where: { tenantId } }),
      prisma.category.findMany({ where: { tenantId } }),
      prisma.tag.findMany({ where: { tenantId } }),
      prisma.recurrenceSeries.findMany({ where: { tenantId } }),
      prisma.financialTransaction.findMany({ where: { tenantId } }),
      prisma.transfer.findMany({ where: { tenantId } }),
    ],
  );

  const transactionIds = transactions.map((transaction: FinancialTransaction) => transaction.id);
  const transactionTags =
    transactionIds.length > 0
      ? await prisma.financialTransactionTag.findMany({
          where: { transactionId: { in: transactionIds } },
        })
      : [];

  const data: BackupData = {
    accounts: accounts.map((account: FinancialAccount) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      initialBalanceCents: account.initialBalanceCents,
      initialBalanceDate: account.initialBalanceDate.toISOString(),
      active: account.active,
    })),
    categories: categories.map((category: Category) => ({
      id: category.id,
      name: category.name,
      iconKey: category.iconKey,
      active: category.active,
    })),
    tags: tags.map((tag: Tag) => ({ id: tag.id, name: tag.name, active: tag.active })),
    recurrenceSeries: recurrenceSeries.map((series: RecurrenceSeries) => ({
      id: series.id,
      kind: series.kind,
      transactionType: series.transactionType,
      frequency: series.frequency,
      interval: series.interval,
      startDate: series.startDate.toISOString(),
      endDate: series.endDate ? series.endDate.toISOString() : null,
      maxOccurrences: series.maxOccurrences,
      baseAmountCents: series.baseAmountCents,
      description: series.description,
      baseDueRule: series.baseDueRule,
      defaultAccountId: series.defaultAccountId,
      defaultCategoryId: series.defaultCategoryId,
      defaultReminderEnabled: series.defaultReminderEnabled,
      defaultSourceAccountId: series.defaultSourceAccountId,
      defaultDestinationAccountId: series.defaultDestinationAccountId,
      active: series.active,
    })),
    transactions: transactions.map((transaction: FinancialTransaction) => ({
      id: transaction.id,
      type: transaction.type,
      description: transaction.description,
      amountCents: transaction.amountCents,
      dueDate: transaction.dueDate.toISOString(),
      settlementDate: transaction.settlementDate ? transaction.settlementDate.toISOString() : null,
      status: transaction.status,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      reminderEnabled: transaction.reminderEnabled,
      ignored: transaction.ignored,
      note: transaction.note,
      cancelledAt: transaction.cancelledAt ? transaction.cancelledAt.toISOString() : null,
      cancelledFromStatus: transaction.cancelledFromStatus,
      recurrenceSeriesId: transaction.recurrenceSeriesId,
      recurrenceOccurrenceKey: transaction.recurrenceOccurrenceKey,
    })),
    transactionTags: transactionTags.map((link: FinancialTransactionTag) => ({
      transactionId: link.transactionId,
      tagId: link.tagId,
    })),
    transfers: transfers.map((transfer: Transfer) => ({
      id: transfer.id,
      sourceAccountId: transfer.sourceAccountId,
      destinationAccountId: transfer.destinationAccountId,
      amountCents: transfer.amountCents,
      scheduledDate: transfer.scheduledDate.toISOString(),
      settlementDate: transfer.settlementDate ? transfer.settlementDate.toISOString() : null,
      status: transfer.status,
      note: transfer.note,
      cancelledAt: transfer.cancelledAt ? transfer.cancelledAt.toISOString() : null,
      recurrenceSeriesId: transfer.recurrenceSeriesId,
      recurrenceOccurrenceKey: transfer.recurrenceOccurrenceKey,
    })),
  };

  return {
    manifest: {
      manifestVersion: BACKUP_MANIFEST_VERSION,
      vortconVersion: VORTCON_VERSION,
      generatedAt: new Date().toISOString(),
      tenantId,
      datasets: Object.keys(data),
      checksum: computeBackupChecksum(data),
    },
    data,
  };
}

interface RestoreResult {
  success: boolean;
  error?: string;
  safetyBackup?: BackupFile;
}

/**
 * Restauração (Seção 145) — Admin-only V1. Pipeline exato da
 * especificação: validar (versão/tenant/integridade, já feito por
 * validateBackup antes de chegar aqui) -> preview (feito na UI antes da
 * confirmação) -> confirmação (o próprio ato de chamar esta função) ->
 * backup de segurança -> transaction -> restore -> auditoria.
 *
 * O "backup de segurança" é o estado atual do tenant exportado ANTES de
 * qualquer alteração, devolvido para quem chamou poder baixar — sem
 * armazenamento de arquivo dedicado (V1, Seção 0: solução mais simples que
 * preserva o requisito). Toda a substituição de dados acontece numa única
 * transação: se qualquer passo falhar, nada é alterado (rollback
 * automático do Postgres) — nunca um estado parcialmente restaurado.
 */
export async function restoreTenantBackup(
  targetTenantId: string,
  backup: BackupFile,
  adminUserId: string,
): Promise<RestoreResult> {
  const validation = validateBackup(backup, targetTenantId);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const safetyBackup = await exportTenantBackup(targetTenantId);

  try {
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.financialTransactionTag.deleteMany({
          where: { transaction: { tenantId: targetTenantId } },
        });
        await tx.transfer.deleteMany({ where: { tenantId: targetTenantId } });
        await tx.financialTransaction.deleteMany({ where: { tenantId: targetTenantId } });
        await tx.recurrenceSeries.deleteMany({ where: { tenantId: targetTenantId } });
        await tx.category.deleteMany({ where: { tenantId: targetTenantId } });
        await tx.tag.deleteMany({ where: { tenantId: targetTenantId } });
        await tx.financialAccount.deleteMany({ where: { tenantId: targetTenantId } });

        const accountIdMap = new Map<string, string>();
        for (const account of backup.data.accounts) {
          const created = await tx.financialAccount.create({
            data: {
              tenantId: targetTenantId,
              name: account.name,
              type: account.type as never,
              initialBalanceCents: account.initialBalanceCents,
              initialBalanceDate: new Date(account.initialBalanceDate),
              active: account.active,
            },
          });
          accountIdMap.set(account.id, created.id);
        }

        const categoryIdMap = new Map<string, string>();
        for (const category of backup.data.categories) {
          const created = await tx.category.create({
            data: {
              tenantId: targetTenantId,
              name: category.name,
              iconKey: category.iconKey,
              active: category.active,
            },
          });
          categoryIdMap.set(category.id, created.id);
        }

        const tagIdMap = new Map<string, string>();
        for (const tag of backup.data.tags) {
          const created = await tx.tag.create({
            data: { tenantId: targetTenantId, name: tag.name, active: tag.active },
          });
          tagIdMap.set(tag.id, created.id);
        }

        const recurrenceIdMap = new Map<string, string>();
        for (const series of backup.data.recurrenceSeries) {
          const created = await tx.recurrenceSeries.create({
            data: {
              tenantId: targetTenantId,
              kind: series.kind as never,
              transactionType: series.transactionType as never,
              frequency: series.frequency as never,
              interval: series.interval,
              startDate: new Date(series.startDate),
              endDate: series.endDate ? new Date(series.endDate) : null,
              maxOccurrences: series.maxOccurrences,
              baseAmountCents: series.baseAmountCents,
              description: series.description,
              baseDueRule: series.baseDueRule as Prisma.InputJsonValue,
              defaultAccountId: series.defaultAccountId
                ? (accountIdMap.get(series.defaultAccountId) ?? null)
                : null,
              defaultCategoryId: series.defaultCategoryId
                ? (categoryIdMap.get(series.defaultCategoryId) ?? null)
                : null,
              defaultReminderEnabled: series.defaultReminderEnabled,
              defaultSourceAccountId: series.defaultSourceAccountId
                ? (accountIdMap.get(series.defaultSourceAccountId) ?? null)
                : null,
              defaultDestinationAccountId: series.defaultDestinationAccountId
                ? (accountIdMap.get(series.defaultDestinationAccountId) ?? null)
                : null,
              active: series.active,
            },
          });
          recurrenceIdMap.set(series.id, created.id);
        }

        const transactionIdMap = new Map<string, string>();
        for (const transaction of backup.data.transactions) {
          const created = await tx.financialTransaction.create({
            data: {
              tenantId: targetTenantId,
              type: transaction.type as never,
              description: transaction.description,
              amountCents: transaction.amountCents,
              dueDate: new Date(transaction.dueDate),
              settlementDate: transaction.settlementDate
                ? new Date(transaction.settlementDate)
                : null,
              status: transaction.status as never,
              accountId: accountIdMap.get(transaction.accountId) ?? '',
              categoryId: transaction.categoryId
                ? (categoryIdMap.get(transaction.categoryId) ?? null)
                : null,
              reminderEnabled: transaction.reminderEnabled,
              ignored: transaction.ignored,
              note: transaction.note,
              cancelledAt: transaction.cancelledAt ? new Date(transaction.cancelledAt) : null,
              cancelledFromStatus: transaction.cancelledFromStatus as never,
              recurrenceSeriesId: transaction.recurrenceSeriesId
                ? (recurrenceIdMap.get(transaction.recurrenceSeriesId) ?? null)
                : null,
              recurrenceOccurrenceKey: transaction.recurrenceOccurrenceKey,
            },
          });
          transactionIdMap.set(transaction.id, created.id);
        }

        for (const link of backup.data.transactionTags) {
          const newTransactionId = transactionIdMap.get(link.transactionId);
          const newTagId = tagIdMap.get(link.tagId);
          if (newTransactionId && newTagId) {
            await tx.financialTransactionTag.create({
              data: { transactionId: newTransactionId, tagId: newTagId },
            });
          }
        }

        for (const transfer of backup.data.transfers) {
          await tx.transfer.create({
            data: {
              tenantId: targetTenantId,
              sourceAccountId: accountIdMap.get(transfer.sourceAccountId) ?? '',
              destinationAccountId: accountIdMap.get(transfer.destinationAccountId) ?? '',
              amountCents: transfer.amountCents,
              scheduledDate: new Date(transfer.scheduledDate),
              settlementDate: transfer.settlementDate ? new Date(transfer.settlementDate) : null,
              status: transfer.status as never,
              note: transfer.note,
              cancelledAt: transfer.cancelledAt ? new Date(transfer.cancelledAt) : null,
              recurrenceSeriesId: transfer.recurrenceSeriesId
                ? (recurrenceIdMap.get(transfer.recurrenceSeriesId) ?? null)
                : null,
              recurrenceOccurrenceKey: transfer.recurrenceOccurrenceKey,
            },
          });
        }
      },
      { timeout: 30000 },
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha desconhecida na restauração.',
    };
  }

  await recordAuditEvent({
    actorType: 'GLOBAL_ADMIN',
    actorId: adminUserId,
    tenantId: targetTenantId,
    eventType: 'TENANT_BACKUP_RESTORED',
    entityType: 'Tenant',
    entityId: targetTenantId,
    metadataSanitized: {
      backupGeneratedAt: backup.manifest.generatedAt,
      counts: {
        accounts: backup.data.accounts.length,
        transactions: backup.data.transactions.length,
      },
    },
  });

  return { success: true, safetyBackup };
}
