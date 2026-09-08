import { createHash } from 'crypto';

export const BACKUP_MANIFEST_VERSION = 1;

export interface BackupManifest {
  manifestVersion: number;
  vortconVersion: string;
  generatedAt: string;
  tenantId: string;
  datasets: string[];
  checksum: string;
}

export interface ExportedAccount {
  id: string;
  name: string;
  type: string;
  initialBalanceCents: number;
  initialBalanceDate: string;
  active: boolean;
}

export interface ExportedCategory {
  id: string;
  name: string;
  iconKey: string;
  active: boolean;
}

export interface ExportedTag {
  id: string;
  name: string;
  active: boolean;
}

export interface ExportedRecurrenceSeries {
  id: string;
  transactionType: string;
  frequency: string;
  interval: number;
  startDate: string;
  endDate: string | null;
  maxOccurrences: number | null;
  baseAmountCents: number;
  baseDueRule: unknown;
  defaultAccountId: string;
  defaultCategoryId: string | null;
  defaultReminderEnabled: boolean;
  active: boolean;
}

export interface ExportedTransaction {
  id: string;
  type: string;
  description: string;
  amountCents: number;
  dueDate: string;
  settlementDate: string | null;
  status: string;
  accountId: string;
  categoryId: string | null;
  reminderEnabled: boolean;
  ignored: boolean;
  note: string | null;
  cancelledAt: string | null;
  cancelledFromStatus: string | null;
  recurrenceSeriesId: string | null;
  recurrenceOccurrenceKey: string | null;
}

export interface ExportedTransactionTag {
  transactionId: string;
  tagId: string;
}

export interface ExportedTransfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  scheduledDate: string;
  settlementDate: string | null;
  status: string;
  note: string | null;
  cancelledAt: string | null;
  recurrenceSeriesId: string | null;
}

export interface BackupData {
  accounts: ExportedAccount[];
  categories: ExportedCategory[];
  tags: ExportedTag[];
  recurrenceSeries: ExportedRecurrenceSeries[];
  transactions: ExportedTransaction[];
  transactionTags: ExportedTransactionTag[];
  transfers: ExportedTransfer[];
}

export interface BackupFile {
  manifest: BackupManifest;
  data: BackupData;
}

/**
 * Checksum do backup (Seção 144: "integridade" no manifesto) — SHA-256
 * sobre o JSON serializado do dataset. JSON.stringify preserva a ordem de
 * inserção das chaves em objetos com chaves string, e o objeto data é
 * sempre montado na mesma ordem de campos na exportação — então o mesmo
 * conteúdo sempre produz o mesmo checksum, de forma determinística.
 */
export function computeBackupChecksum(data: BackupData): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validação do backup antes de qualquer restauração (Seção 145: "validar
 * -> versão -> tenant -> integridade"). Pura — recebe o arquivo já
 * parseado e o tenant de destino, nunca acessa banco. As três checagens,
 * na ordem exigida pela especificação:
 * 1. Versão do manifesto compatível.
 * 2. Vínculo de tenant — o backup só pode ser restaurado no MESMO tenant
 *    de onde saiu (Seção 144: "não fornecer dump multitenant" — e Seção
 *    142: nunca confiar em tenantId vindo de fora, então targetTenantId
 *    aqui sempre vem do backend, nunca do arquivo em si).
 * 3. Integridade — o checksum recalculado precisa bater com o do manifesto.
 */
export function validateBackup(backup: BackupFile, targetTenantId: string): BackupValidationResult {
  if (backup.manifest.manifestVersion !== BACKUP_MANIFEST_VERSION) {
    return {
      valid: false,
      error: `Versão de backup incompatível (esperado ${BACKUP_MANIFEST_VERSION}, recebido ${backup.manifest.manifestVersion}).`,
    };
  }

  if (backup.manifest.tenantId !== targetTenantId) {
    return {
      valid: false,
      error: 'Este backup pertence a outro tenant e não pode ser restaurado aqui.',
    };
  }

  const recomputedChecksum = computeBackupChecksum(backup.data);
  if (recomputedChecksum !== backup.manifest.checksum) {
    return {
      valid: false,
      error: 'O arquivo parece corrompido ou foi alterado — o checksum não confere.',
    };
  }

  return { valid: true };
}

export interface BackupPreview {
  generatedAt: string;
  counts: {
    accounts: number;
    categories: number;
    tags: number;
    recurrenceSeries: number;
    transactions: number;
    transfers: number;
  };
}

/** Prévia (Seção 145: "preview" antes da confirmação) — só contagens, nunca os dados completos. */
export function buildBackupPreview(backup: BackupFile): BackupPreview {
  return {
    generatedAt: backup.manifest.generatedAt,
    counts: {
      accounts: backup.data.accounts.length,
      categories: backup.data.categories.length,
      tags: backup.data.tags.length,
      recurrenceSeries: backup.data.recurrenceSeries.length,
      transactions: backup.data.transactions.length,
      transfers: backup.data.transfers.length,
    },
  };
}
