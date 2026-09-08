'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui';

interface BackupRestoreProps {
  tenantId: string;
}

interface PreviewCounts {
  accounts: number;
  categories: number;
  tags: number;
  recurrenceSeries: number;
  transactions: number;
  transfers: number;
}

/**
 * Restauração de backup (Seção 145) — Admin-only V1. Fluxo em duas
 * etapas na tela: escolher arquivo -> prévia com contagens -> confirmação
 * explícita separada (nunca restaura no mesmo clique que envia o
 * arquivo). Depois de confirmar, a rota já cuida do backup de segurança e
 * da transação — aqui só oferece o download do backup de segurança
 * recebido de volta.
 */
export function BackupRestore({ tenantId }: BackupRestoreProps): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewCounts | null>(null);
  const [previewGeneratedAt, setPreviewGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const [safetyBackupUrl, setSafetyBackupUrl] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setPreview(null);
    setError(null);
    setRestored(false);

    if (!selectedFile) return;

    setLoading(true);
    try {
      const text = await selectedFile.text();
      const response = await fetch(`/api/admin/tenants/${tenantId}/backup/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const body = (await response.json()) as {
        message?: string;
        preview?: { counts: PreviewCounts; generatedAt: string };
      };
      if (!response.ok || !body.preview) {
        setError(body.message ?? 'Não foi possível validar este arquivo.');
        return;
      }
      setPreview(body.preview.counts);
      setPreviewGeneratedAt(body.preview.generatedAt);
    } catch {
      setError('Arquivo inválido — não parece ser um backup do VortCon.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRestore(): Promise<void> {
    if (!file) return;
    if (
      !window.confirm(
        'Isso vai APAGAR todos os dados financeiros atuais deste tenant e substituir pelo conteúdo do backup. Um backup de segurança do estado atual será gerado antes. Confirma?',
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const response = await fetch(`/api/admin/tenants/${tenantId}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const body = (await response.json()) as { message?: string; safetyBackup?: unknown };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível restaurar.');
        return;
      }

      if (body.safetyBackup) {
        const blob = new Blob([JSON.stringify(body.safetyBackup, null, 2)], {
          type: 'application/json',
        });
        setSafetyBackupUrl(URL.createObjectURL(blob));
      }
      setRestored(true);
      setPreview(null);
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-secondary">
        Restaura os dados financeiros deste tenant a partir de um arquivo de backup exportado pelo
        próprio tenant. Operação destrutiva — substitui os dados atuais.
      </p>

      <input
        type="file"
        accept="application/json"
        onChange={handleFileSelected}
        className="text-sm text-ink-secondary file:mr-3 file:rounded-md file:border-0 file:bg-surface-page file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-primary"
      />

      {error ? <p className="text-sm text-financial-danger">{error}</p> : null}

      {preview ? (
        <div className="rounded-md border border-ink-secondary/15 bg-surface-page p-3 text-sm">
          <p className="mb-2 font-medium text-ink-primary">
            Backup gerado em{' '}
            {previewGeneratedAt ? new Date(previewGeneratedAt).toLocaleString('pt-BR') : '—'}
          </p>
          <ul className="grid grid-cols-2 gap-1 text-xs text-ink-secondary sm:grid-cols-3">
            <li>Contas: {preview.accounts}</li>
            <li>Categorias: {preview.categories}</li>
            <li>Tags: {preview.tags}</li>
            <li>Recorrências: {preview.recurrenceSeries}</li>
            <li>Transações: {preview.transactions}</li>
            <li>Transferências: {preview.transfers}</li>
          </ul>
          <Button
            variant="danger"
            onClick={handleConfirmRestore}
            loading={loading}
            className="mt-3"
          >
            Confirmar restauração (substitui os dados atuais)
          </Button>
        </div>
      ) : null}

      {restored ? (
        <div className="rounded-md border border-financial-success/30 bg-financial-success/5 p-3 text-sm">
          <p className="mb-2 text-financial-success">Restauração concluída com sucesso.</p>
          {safetyBackupUrl ? (
            <a href={safetyBackupUrl} download="backup-de-seguranca-antes-da-restauracao.json">
              <Button size="sm" variant="secondary">
                Baixar backup de segurança (estado anterior)
              </Button>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
