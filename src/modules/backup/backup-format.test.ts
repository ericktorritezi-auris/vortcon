import { describe, expect, it } from 'vitest';
import {
  BACKUP_MANIFEST_VERSION,
  buildBackupPreview,
  computeBackupChecksum,
  validateBackup,
} from './backup-format';
import type { BackupData, BackupFile } from './backup-format';

const emptyData: BackupData = {
  accounts: [],
  categories: [],
  tags: [],
  recurrenceSeries: [],
  transactions: [],
  transactionTags: [],
  transfers: [],
};

function buildValidBackup(tenantId: string, data: BackupData = emptyData): BackupFile {
  return {
    manifest: {
      manifestVersion: BACKUP_MANIFEST_VERSION,
      vortconVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      tenantId,
      datasets: Object.keys(data),
      checksum: computeBackupChecksum(data),
    },
    data,
  };
}

describe('computeBackupChecksum', () => {
  it('o mesmo conteúdo produz sempre o mesmo checksum', () => {
    const data = {
      ...emptyData,
      accounts: [
        {
          id: '1',
          name: 'Conta',
          type: 'CHECKING',
          initialBalanceCents: 1000,
          initialBalanceDate: '2026-01-01',
          active: true,
        },
      ],
    };
    expect(computeBackupChecksum(data)).toBe(computeBackupChecksum(data));
  });

  it('conteúdo diferente produz checksum diferente', () => {
    const dataA = {
      ...emptyData,
      accounts: [
        {
          id: '1',
          name: 'Conta A',
          type: 'CHECKING',
          initialBalanceCents: 1000,
          initialBalanceDate: '2026-01-01',
          active: true,
        },
      ],
    };
    const dataB = {
      ...emptyData,
      accounts: [
        {
          id: '1',
          name: 'Conta B',
          type: 'CHECKING',
          initialBalanceCents: 1000,
          initialBalanceDate: '2026-01-01',
          active: true,
        },
      ],
    };
    expect(computeBackupChecksum(dataA)).not.toBe(computeBackupChecksum(dataB));
  });
});

describe('validateBackup (Seção 145 — validar versão, tenant, integridade)', () => {
  it('aceita um backup válido para o tenant certo', () => {
    const backup = buildValidBackup('tenant-a');
    expect(validateBackup(backup, 'tenant-a').valid).toBe(true);
  });

  it('rejeita restaurar o backup de um tenant em outro tenant (Seção 144 — nunca dump multitenant)', () => {
    const backup = buildValidBackup('tenant-a');
    const result = validateBackup(backup, 'tenant-b');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('outro tenant');
  });

  it('rejeita versão de manifesto incompatível', () => {
    const backup = buildValidBackup('tenant-a');
    backup.manifest.manifestVersion = 999;
    const result = validateBackup(backup, 'tenant-a');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('incompatível');
  });

  it('rejeita quando o checksum não bate (arquivo alterado/corrompido)', () => {
    const backup = buildValidBackup('tenant-a', {
      ...emptyData,
      accounts: [
        {
          id: '1',
          name: 'Conta',
          type: 'CHECKING',
          initialBalanceCents: 1000,
          initialBalanceDate: '2026-01-01',
          active: true,
        },
      ],
    });
    backup.data.accounts[0]!.initialBalanceCents = 999999;
    const result = validateBackup(backup, 'tenant-a');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('checksum');
  });
});

describe('buildBackupPreview', () => {
  it('conta cada dataset corretamente, sem expor os dados completos', () => {
    const backup = buildValidBackup('tenant-a', {
      ...emptyData,
      accounts: [
        {
          id: '1',
          name: 'Conta',
          type: 'CHECKING',
          initialBalanceCents: 1000,
          initialBalanceDate: '2026-01-01',
          active: true,
        },
      ],
      categories: [
        { id: '1', name: 'Cat A', iconKey: 'wallet', active: true },
        { id: '2', name: 'Cat B', iconKey: 'wallet', active: true },
      ],
    });

    const preview = buildBackupPreview(backup);
    expect(preview.counts.accounts).toBe(1);
    expect(preview.counts.categories).toBe(2);
    expect(preview.counts.transactions).toBe(0);
  });
});
