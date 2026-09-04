'use client';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { DOMParser as PMDOMParser, type Schema } from '@tiptap/pm/model';
import { marked } from 'marked';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/Overlay';
import { useToast } from '@/components/Toast';

const lowlight = createLowlight(common);

const BLOCK_MD_RE = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|---\s*$)/m;
const INLINE_MD_RE = /(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\n]+\))/;

function looksLikeMarkdown(text: string): boolean {
  return BLOCK_MD_RE.test(text) || INLINE_MD_RE.test(text);
}

function mdToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

function htmlToSlice(html: string, schema: Schema) {
  // marked output is unsanitised; innerHTML would run it (an <img onerror> fires
  // even detached). DOMParser builds an inert doc, and ProseMirror keeps only
  // schema-allowed nodes/attrs.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return PMDOMParser.fromSchema(schema).parseSlice(doc.body);
}

const LinkIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

interface LinkModalProps {
  open: boolean;
  initialUrl: string;
  hasExisting: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  onRemove: () => void;
}

function LinkModal({ open, initialUrl, hasExisting, onClose, onSubmit, onRemove }: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // The field belongs to this opening, not to the last one.
  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, initialUrl]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="link-modal-title"
      // Typed input here — a stray backdrop click shouldn't discard it.
      dismissOnScrim={false}
    >
      <form onSubmit={submit}>
        <div className="flex items-start gap-4">
          <div className="grid place-items-center flex-shrink-0 w-10 h-10 rounded-full bg-accent-soft text-accent-content">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="link-modal-title" className="t-heading text-content">
              {hasExisting ? 'Edit link' : 'Insert link'}
            </h2>
            <p className="t-secondary mt-1">Point the selected text somewhere.</p>
          </div>
        </div>

        <label className="block mt-5">
          <span className="t-caption font-medium text-content-secondary">URL</span>
          <input
            ref={inputRef}
            data-autofocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="input mt-1 font-mono text-sm"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {hasExisting && (
            <button type="button" onClick={onRemove} className="btn btn-danger sm:mr-auto">
              Remove link
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {hasExisting ? 'Update' : 'Insert'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Toolbar({ editor, onOpenLink }: { editor: Editor; onOpenLink: () => void }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      setUploading(true);
      try {
        const { url } = await api<{ url: string }>('/api/v1/media/upload', {
          method: 'POST',
          body: fd,
        });
        editor.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        toast({ title: 'Upload failed', message: (e as Error).message, tone: 'error' });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }, [editor, toast]);

  const Divider = () => <span className="w-px bg-line-strong mx-1 self-stretch my-1" aria-hidden />;

  // Grouped by effect: marks, structure, inserts, history — proximity, not labels.
  const marks = [
    {
      key: 'bold',
      title: 'Bold',
      body: <strong>B</strong>,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      title: 'Italic',
      body: <i>I</i>,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: 'strike',
      title: 'Strikethrough',
      body: <s>S</s>,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
  ];

  const blocks = [
    {
      key: 'heading1',
      title: 'Heading 1',
      body: 'H1',
      active: editor.isActive('heading', { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      key: 'heading2',
      title: 'Heading 2',
      body: 'H2',
      active: editor.isActive('heading', { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: 'heading3',
      title: 'Heading 3',
      body: 'H3',
      active: editor.isActive('heading', { level: 3 }),
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: 'bulletList',
      title: 'Bullet list',
      body: '•',
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'orderedList',
      title: 'Numbered list',
      body: '1.',
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      key: 'blockquote',
      title: 'Blockquote',
      body: '❝',
      active: editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      key: 'codeBlock',
      title: 'Code block',
      body: '</>',
      active: editor.isActive('codeBlock'),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
  ];

  return (
    <div className="material-thin sticky top-14 z-10 flex flex-wrap items-center gap-1 p-2 rounded-t-xl border-b border-line">
      {marks.map((m) => (
        <ToolButton key={m.key} title={m.title} active={editor.isActive(m.key)} onClick={m.run}>
          {m.body}
        </ToolButton>
      ))}
      <Divider />
      {blocks.map((b) => (
        <ToolButton key={b.key} title={b.title} active={b.active} onClick={b.run}>
          {b.body}
        </ToolButton>
      ))}
      <Divider />
      <ToolButton title="Link" active={editor.isActive('link')} onClick={onOpenLink}>
        <LinkIcon />
      </ToolButton>
      <ToolButton
        title={uploading ? 'Uploading image…' : 'Insert image'}
        active={false}
        disabled={uploading}
        onClick={uploadImage}
      >
        {uploading ? (
          <span className="skeleton block w-4 h-4 rounded" aria-hidden />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
            aria-hidden
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        )}
      </ToolButton>
      <Divider />
      <ToolButton
        title="Undo"
        active={false}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </ToolButton>
      <ToolButton
        title="Redo"
        active={false}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </ToolButton>
    </div>
  );
}

function ToolButton({
  title,
  active,
  onClick,
  disabled,
  children,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium disabled:opacity-35 ${
        active
          ? 'bg-inverse text-on-inverse'
          : 'text-content-secondary hover:bg-surface hover:text-content hover:shadow-sm'
      }`}
    >
      {children}
    </button>
  );
}

interface Props {
  initialContent: object | null;
  onChange: (json: object) => void;
}

export default function BlockEditor({ initialContent, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Write something worth reading…' }),
    ],
    editorProps: {
      handlePaste(view, event) {
        const html = event.clipboardData?.getData('text/html');
        if (html && html.trim()) return false;
        const text = event.clipboardData?.getData('text/plain');
        if (!text || !looksLikeMarkdown(text)) return false;
        try {
          const converted = mdToHtml(text);
          const slice = htmlToSlice(converted, view.state.schema);
          view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
          return true;
        } catch {
          return false;
        }
      },
    },
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onSelectionUpdate: () => setTick((t) => t + 1),
    onTransaction: () => setTick((t) => t + 1),
  });

  if (!editor)
    return (
      <div className="rounded-xl border border-line bg-surface/60 p-5 space-y-3">
        <div className="skeleton h-8 w-full" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    );

  const existingHref: string | undefined = editor.getAttributes('link').href;

  return (
    <div className="bg-surface/70 border border-line rounded-xl">
      <Toolbar editor={editor} onOpenLink={() => setLinkOpen(true)} />
      <div className="p-5">
        <EditorContent editor={editor} />
      </div>
      <LinkModal
        open={linkOpen}
        initialUrl={existingHref ?? 'https://'}
        hasExisting={Boolean(existingHref)}
        onClose={() => setLinkOpen(false)}
        onSubmit={(url) => {
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url, target: '_blank' })
            .run();
          setLinkOpen(false);
        }}
        onRemove={() => {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          setLinkOpen(false);
        }}
      />
    </div>
  );
}
