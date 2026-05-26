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

const lowlight = createLowlight(common);

// Markdown helpers

const BLOCK_MD_RE = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|---\s*$)/m;
const INLINE_MD_RE = /(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\n]+\))/;

function looksLikeMarkdown(text: string): boolean {
  return BLOCK_MD_RE.test(text) || INLINE_MD_RE.test(text);
}

function mdToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

function htmlToSlice(html: string, schema: Schema) {
  const dom = document.createElement('div');
  dom.innerHTML = html;
  return PMDOMParser.fromSchema(schema).parseSlice(dom);
}

// Link modal

interface LinkModalProps {
  initialUrl: string;
  hasExisting: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  onRemove: () => void;
}

function LinkModal({ initialUrl, hasExisting, onClose, onSubmit, onRemove }: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-modal-title"
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 max-w-md w-full p-6 animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="grid place-items-center flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-hidden
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="link-modal-title" className="font-semibold text-slate-900">
              {hasExisting ? 'Edit link' : 'Insert link'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Add a URL — leave blank and press Remove to unlink.
            </p>
          </div>
        </div>

        <label className="block mt-5">
          <span className="text-xs font-medium text-slate-600">URL</span>
          <input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="input mt-1 font-mono text-sm"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          {hasExisting && (
            <button
              type="button"
              onClick={onRemove}
              className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors mr-auto"
            >
              Remove link
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {hasExisting ? 'Update' : 'Insert'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Toolbar

function Toolbar({ editor, onOpenLink }: { editor: Editor; onOpenLink: () => void }) {
  const btn = (active: boolean) =>
    `inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white hover:text-slate-900'
    }`;

  const uploadImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      try {
        const { url } = await api<{ url: string }>('/api/v1/media/upload', {
          method: 'POST',
          body: fd,
        });
        editor.chain().focus().setImage({ src: url }).run();
      } catch (e) {
        alert(`Upload failed: ${(e as Error).message}`);
      }
    };
    input.click();
  }, [editor]);

  const Divider = () => <span className="w-px bg-slate-200 mx-1 self-stretch" />;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
      <button
        title="Bold"
        className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </button>
      <button
        title="Italic"
        className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </button>
      <button
        title="Strikethrough"
        className={btn(editor.isActive('strike'))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </button>
      <Divider />
      <button
        title="Heading 1"
        className={btn(editor.isActive('heading', { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </button>
      <button
        title="Heading 2"
        className={btn(editor.isActive('heading', { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        title="Heading 3"
        className={btn(editor.isActive('heading', { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <Divider />
      <button
        title="Bullet list"
        className={btn(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </button>
      <button
        title="Numbered list"
        className={btn(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </button>
      <button
        title="Blockquote"
        className={btn(editor.isActive('blockquote'))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </button>
      <button
        title="Code block"
        className={btn(editor.isActive('codeBlock'))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {'</>'}
      </button>
      <Divider />
      <button title="Link" className={btn(editor.isActive('link'))} onClick={onOpenLink}>
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
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      <button title="Insert image" className={btn(false)} onClick={uploadImage}>
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
      </button>
      <Divider />
      <button
        title="Undo"
        className={btn(false)}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </button>
      <button
        title="Redo"
        className={btn(false)}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </button>
    </div>
  );
}

// Editor

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
    return <div className="h-[400px] grid place-items-center text-slate-400">Loading editor…</div>;

  const existingHref: string | undefined = editor.getAttributes('link').href;

  return (
    <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden">
      <Toolbar editor={editor} onOpenLink={() => setLinkOpen(true)} />
      <div className="p-5">
        <EditorContent editor={editor} />
      </div>
      {linkOpen && (
        <LinkModal
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
      )}
    </div>
  );
}
