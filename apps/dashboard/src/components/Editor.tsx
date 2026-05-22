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
import { useCallback } from 'react';
import { api } from '@/lib/api';

const lowlight = createLowlight(common);

// ────────────────────────────────────────────────────────────────────────
// Markdown helpers
// ────────────────────────────────────────────────────────────────────────

// Heuristic: does the pasted plain text contain any markdown syntax worth
// converting? Without this, every plain paste would trigger conversion and
// alter ordinary text (e.g. an asterisk in prose).
const BLOCK_MD_RE = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|---\s*$)/m;
const INLINE_MD_RE = /(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\n]+\))/;

function looksLikeMarkdown(text: string): boolean {
  return BLOCK_MD_RE.test(text) || INLINE_MD_RE.test(text);
}

function mdToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

// Turn an HTML string into a ProseMirror Slice using the editor schema.
function htmlToSlice(html: string, schema: Schema) {
  const dom = document.createElement('div');
  dom.innerHTML = html;
  return PMDOMParser.fromSchema(schema).parseSlice(dom);
}

// ────────────────────────────────────────────────────────────────────────
// Toolbar
// ────────────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    `px-2 py-1 rounded text-sm border ${active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-100'}`;

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

  const setLink = useCallback(() => {
    const url = window.prompt('URL', editor.getAttributes('link').href ?? 'https://');
    if (url === null) return;
    if (url === '') return editor.chain().focus().extendMarkRange('link').unsetLink().run();
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border-b bg-slate-50">
      <button
        className={btn(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        className={btn(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </button>
      <button
        className={btn(editor.isActive('strike'))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </button>
      <span className="w-px bg-slate-300 mx-1" />
      <button
        className={btn(editor.isActive('heading', { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </button>
      <button
        className={btn(editor.isActive('heading', { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        className={btn(editor.isActive('heading', { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <span className="w-px bg-slate-300 mx-1" />
      <button
        className={btn(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </button>
      <button
        className={btn(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </button>
      <button
        className={btn(editor.isActive('blockquote'))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        “ ”
      </button>
      <button
        className={btn(editor.isActive('codeBlock'))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        {'</>'}
      </button>
      <span className="w-px bg-slate-300 mx-1" />
      <button className={btn(editor.isActive('link'))} onClick={setLink}>
        🔗
      </button>
      <button className={btn(false)} onClick={uploadImage}>
        🖼 Image
      </button>
      <span className="w-px bg-slate-300 mx-1" />
      <button className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </button>
      <button className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Editor
// ────────────────────────────────────────────────────────────────────────

interface Props {
  initialContent: object | null;
  onChange: (json: object) => void;
}

export default function BlockEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      // TipTap 3: StarterKit now bundles Link (and Underline). Disable the
      // ones we configure ourselves to prevent a duplicate-extension error.
      StarterKit.configure({ codeBlock: false, link: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Write something worth reading…' }),
    ],
    editorProps: {
      // When the user pastes plain text that looks like markdown, convert it
      // to HTML via `marked` and insert the result as a parsed slice. If the
      // clipboard already has HTML, or the text doesn't look like markdown,
      // we fall through to TipTap's default paste handling.
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
  });

  if (!editor)
    return <div className="h-[400px] grid place-items-center text-slate-400">Loading editor…</div>;

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <Toolbar editor={editor} />
      <div className="p-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
