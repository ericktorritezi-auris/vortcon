'use client';

import { Bold, Heading2, Heading3, Italic, Link2, List, Minus } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Checkbox } from '@/shared/ui';

interface LegalEditorProps {
  slug: string;
  label: string;
  initialContent: string;
  publishedVersion: number | null;
}

/**
 * Editor rich-text (Seção 130). Deliberadamente simples: um textarea com
 * botões que envolvem a seleção nas tags permitidas, em vez de um WYSIWYG
 * completo (TipTap/Slate) — o conteúdo é sempre HTML das tags autorizadas, e
 * a sanitização de verdade acontece no servidor ao salvar (nunca confiar só
 * no que este componente produz). Suficiente para o conjunto de formatação
 * exigido (títulos, parágrafos, negrito, itálico, listas, links, divisores)
 * sem o peso de uma biblioteca de editor completa.
 */
export function LegalEditor({
  slug,
  label,
  initialContent,
  publishedVersion,
}: LegalEditorProps): React.ReactElement {
  const [content, setContent] = useState(initialContent);
  const [requiresReacceptance, setRequiresReacceptance] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(openTag: string, closeTag: string): void {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || 'texto';
    const next =
      value.slice(0, selectionStart) + openTag + selected + closeTag + value.slice(selectionEnd);
    setContent(next);
  }

  async function handleSaveDraft(): Promise<void> {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/legal/${slug}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml: content }),
      });
      const body = (await response.json()) as { contentHtml?: string };
      if (!response.ok) {
        setStatus('Não foi possível salvar o rascunho.');
        return;
      }
      if (body.contentHtml) setContent(body.contentHtml);
      setStatus('Rascunho salvo.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setSaving(true);
    setStatus(null);
    try {
      await handleSaveDraft();
      const response = await fetch(`/api/admin/legal/${slug}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiresReacceptance }),
      });
      const body = (await response.json()) as { message?: string };
      setStatus(
        response.ok ? 'Publicado com sucesso.' : (body.message ?? 'Não foi possível publicar.'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink-primary">{label}</h1>
        <p className="text-xs text-ink-secondary">
          {publishedVersion
            ? `Versão publicada atual: ${publishedVersion}`
            : 'Ainda sem versão publicada'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border border-ink-secondary/20 bg-surface-page p-1.5">
        <ToolbarButton
          icon={Heading2}
          label="Título"
          onClick={() => wrapSelection('<h2>', '</h2>')}
        />
        <ToolbarButton
          icon={Heading3}
          label="Subtítulo"
          onClick={() => wrapSelection('<h3>', '</h3>')}
        />
        <ToolbarButton
          icon={Bold}
          label="Negrito"
          onClick={() => wrapSelection('<strong>', '</strong>')}
        />
        <ToolbarButton
          icon={Italic}
          label="Itálico"
          onClick={() => wrapSelection('<em>', '</em>')}
        />
        <ToolbarButton
          icon={List}
          label="Lista"
          onClick={() => wrapSelection('<ul>\n  <li>', '</li>\n</ul>')}
        />
        <ToolbarButton
          icon={Link2}
          label="Link"
          onClick={() => wrapSelection('<a href="https://">', '</a>')}
        />
        <ToolbarButton icon={Minus} label="Divisor" onClick={() => wrapSelection('<hr>', '')} />
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={16}
        className="w-full rounded-md border border-ink-secondary/30 bg-white p-3 font-mono text-sm text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-intelligence"
      />

      <Checkbox
        label="Exigir novo aceite dos usuários ao publicar esta versão"
        checked={requiresReacceptance}
        onChange={(event) => setRequiresReacceptance(event.target.checked)}
      />

      {status ? <p className="text-sm text-ink-secondary">{status}</p> : null}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleSaveDraft} loading={saving}>
          Salvar rascunho
        </Button>
        <Button onClick={handlePublish} loading={saving}>
          Publicar
        </Button>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-white hover:text-ink-primary"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
