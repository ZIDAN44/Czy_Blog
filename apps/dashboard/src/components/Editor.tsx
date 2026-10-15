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
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
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
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface-sunken ring-1 ring-line text-content-secondary">
            <Link2 className="w-4 h-4" />
          </span>
          <div>
            <h2 id="link-modal-title" className="t-heading">
              {hasExisting ? 'Edit link' : 'Insert link'}
            </h2>
            <p className="t-caption">Point the selected text somewhere.</p>
          </div>
        </div>

        <label className="block mt-5">
          <span className="field-label">URL</span>
          <input
            ref={inputRef}
            data-autofocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="input font-mono text-[0.8125rem]"
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

interface Tool {
  key: string;
  title: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  run: () => void;
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

  const chain = () => editor.chain().focus();

  // Grouped by effect: marks, structure, inserts, history.
  const groups: Tool[][] = [
    [
      {
        key: 'bold',
        title: 'Bold (Ctrl+B)',
        icon: Bold,
        active: editor.isActive('bold'),
        run: () => chain().toggleBold().run(),
      },
      {
        key: 'italic',
        title: 'Italic (Ctrl+I)',
        icon: Italic,
        active: editor.isActive('italic'),
        run: () => chain().toggleItalic().run(),
      },
      {
        key: 'strike',
        title: 'Strikethrough',
        icon: Strikethrough,
        active: editor.isActive('strike'),
        run: () => chain().toggleStrike().run(),
      },
      {
        key: 'code',
        title: 'Inline code',
        icon: Code,
        active: editor.isActive('code'),
        run: () => chain().toggleCode().run(),
      },
    ],
    [
      {
        key: 'h1',
        title: 'Heading 1',
        icon: Heading1,
        active: editor.isActive('heading', { level: 1 }),
        run: () => chain().toggleHeading({ level: 1 }).run(),
      },
      {
        key: 'h2',
        title: 'Heading 2',
        icon: Heading2,
        active: editor.isActive('heading', { level: 2 }),
        run: () => chain().toggleHeading({ level: 2 }).run(),
      },
      {
        key: 'h3',
        title: 'Heading 3',
        icon: Heading3,
        active: editor.isActive('heading', { level: 3 }),
        run: () => chain().toggleHeading({ level: 3 }).run(),
      },
      {
        key: 'ul',
        title: 'Bullet list',
        icon: List,
        active: editor.isActive('bulletList'),
        run: () => chain().toggleBulletList().run(),
      },
      {
        key: 'ol',
        title: 'Numbered list',
        icon: ListOrdered,
        active: editor.isActive('orderedList'),
        run: () => chain().toggleOrderedList().run(),
      },
      {
        key: 'quote',
        title: 'Quote',
        icon: Quote,
        active: editor.isActive('blockquote'),
        run: () => chain().toggleBlockquote().run(),
      },
      {
        key: 'codeBlock',
        title: 'Code block',
        icon: SquareCode,
        active: editor.isActive('codeBlock'),
        run: () => chain().toggleCodeBlock().run(),
      },
    ],
    [
      {
        key: 'link',
        title: 'Link (Ctrl+K)',
        icon: Link2,
        active: editor.isActive('link'),
        run: onOpenLink,
      },
      {
        key: 'image',
        title: uploading ? 'Uploading image…' : 'Insert image',
        icon: uploading ? Loader2 : ImagePlus,
        disabled: uploading,
        run: uploadImage,
      },
      { key: 'hr', title: 'Divider', icon: Minus, run: () => chain().setHorizontalRule().run() },
    ],
    [
      {
        key: 'undo',
        title: 'Undo',
        icon: Undo2,
        disabled: !editor.can().undo(),
        run: () => chain().undo().run(),
      },
      {
        key: 'redo',
        title: 'Redo',
        icon: Redo2,
        disabled: !editor.can().redo(),
        run: () => chain().redo().run(),
      },
    ],
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="chrome sticky top-14 lg:top-0 z-10 flex items-center gap-0.5 px-3 sm:px-6 py-1.5 border-y !border-line overflow-x-auto"
    >
      {groups.map((g, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="w-px h-5 bg-line-strong mx-1.5" aria-hidden />}
          {g.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                title={t.title}
                aria-label={t.title}
                aria-pressed={t.active ?? false}
                disabled={t.disabled}
                onClick={t.run}
                className={`grid place-items-center w-8 h-8 shrink-0 rounded-md disabled:opacity-30 ${
                  t.active
                    ? 'bg-fill-active text-content'
                    : 'text-content-secondary hover:bg-fill-hover hover:text-content'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${t.key === 'image' && uploading ? 'animate-spin' : ''}`}
                  strokeWidth={t.active ? 2.4 : 2}
                />
              </button>
            );
          })}
        </div>
      ))}
    </div>
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
      handleKeyDown(_view, event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
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
      <div className="px-6 py-8 space-y-3">
        <div className="skeleton h-5 w-full" />
        <div className="skeleton h-5 w-11/12" />
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-5 w-2/3" />
      </div>
    );

  const existingHref: string | undefined = editor.getAttributes('link').href;

  return (
    <div>
      <Toolbar editor={editor} onOpenLink={() => setLinkOpen(true)} />
      <div
        className="px-4 sm:px-6 py-8 min-h-[28rem] cursor-text"
        onClick={(e) => {
          // Clicking the empty area below the text still focuses the editor.
          if (e.target === e.currentTarget) editor.chain().focus('end').run();
        }}
      >
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
