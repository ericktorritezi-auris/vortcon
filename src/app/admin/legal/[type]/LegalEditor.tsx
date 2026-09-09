'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Unlink,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Checkbox } from '@/shared/ui';

interface LegalEditorProps {
  slug: string;
  label: string;
  initialContent: string;
  publishedVersion: number | null;
}

/**
 * Editor WYSIWYG de verdade (Estágio 16B, substituindo o textarea com
 * toolbar do Estágio 12). Construído com TipTap — o que é digitado e
 * formatado aparece idêntico na tela, sem nenhuma marcação HTML visível
 * pra quem está escrevendo. `StarterKit` é restringido às mesmas tags
 * permitidas pela sanitização do servidor (`ALLOWED_TAGS` em
 * `shared/security/sanitize.ts`) — nunca mais capacidade no editor do que
 * o que realmente sobrevive ao salvar. A sanitização real continua
 * acontecendo no servidor a cada save (nunca confiar só no que o cliente
 * produz) — este componente só troca a experiência de edição, o contrato
 * com o backend (enviar `contentHtml`) não muda.
 */
export function LegalEditor({
  slug,
  label,
  initialContent,
  publishedVersion,
}: LegalEditorProps): React.ReactElement {
  const [requiresReacceptance, setRequiresReacceptance] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Fora da lista permitida (Seção 130) — nunca registrados, pra nem
        // aparecer como opção que depois seria descartada ao salvar.
        blockquote: false,
        code: false,
        codeBlock: false,
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm min-h-[320px] max-w-none rounded-b-md border border-t-0 border-ink-secondary/30 bg-white p-4 text-ink-primary focus:outline-none [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_a]:text-brand-intelligence [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4',
      },
    },
  });

  function handleToggleLink(): void {
    if (!editor) return;

    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt('Endereço do link (https://...)');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  async function handleSaveDraft(): Promise<void> {
    if (!editor) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/legal/${slug}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml: editor.getHTML() }),
      });
      const body = (await response.json()) as { contentHtml?: string };
      if (!response.ok) {
        setStatus('Não foi possível salvar o rascunho.');
        return;
      }
      if (body.contentHtml) editor.commands.setContent(body.contentHtml);
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

  if (!editor) {
    return <p className="text-sm text-ink-secondary">Carregando editor...</p>;
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

      <div>
        <div className="flex flex-wrap gap-1 rounded-t-md border border-ink-secondary/30 bg-surface-page p-1.5">
          <ToolbarButton
            icon={Heading2}
            label="Título"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            icon={Heading3}
            label="Subtítulo"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <ToolbarButton
            icon={Bold}
            label="Negrito"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon={Italic}
            label="Itálico"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon={List}
            label="Lista com marcadores"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon={ListOrdered}
            label="Lista numerada"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={editor.isActive('link') ? Unlink : Link2}
            label={editor.isActive('link') ? 'Remover link' : 'Link'}
            active={editor.isActive('link')}
            onClick={handleToggleLink}
          />
          <ToolbarButton
            icon={Minus}
            label="Divisor"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          />
        </div>

        <EditorContent editor={editor} />
      </div>

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
  active = false,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
  active?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-md ${
        active
          ? 'bg-brand-deep/10 text-brand-deep'
          : 'text-ink-secondary hover:bg-white hover:text-ink-primary'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
