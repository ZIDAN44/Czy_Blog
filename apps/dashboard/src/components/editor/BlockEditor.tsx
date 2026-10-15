'use client';
import { useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import LinkModal from './LinkModal';
import Toolbar from './Toolbar';
import { handleMarkdownPaste } from './markdownPaste';

// Keep the extension list in step with the reader's TiptapRender (apps/web).
const lowlight = createLowlight(common);
const EXTENSIONS = [
  StarterKit.configure({ codeBlock: false, link: false }),
  CodeBlockLowlight.configure({ lowlight }),
  Image,
  Link.configure({ openOnClick: false, autolink: true }),
  Placeholder.configure({ placeholder: 'Write something worth reading…' }),
];

const isLinkShortcut = (e: KeyboardEvent) =>
  (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';

interface Props {
  initialContent: object | null;
  onChange: (json: object) => void;
}

export default function BlockEditor({ initialContent, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [, setTick] = useState(0); // re-render on selection so toolbar states stay current

  const editor = useEditor({
    extensions: EXTENSIONS,
    editorProps: {
      handleKeyDown(_view, event) {
        if (!isLinkShortcut(event)) return false;
        event.preventDefault();
        setLinkOpen(true);
        return true;
      },
      handlePaste: handleMarkdownPaste,
    },
    content: initialContent ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    onSelectionUpdate: () => setTick((t) => t + 1),
    onTransaction: () => setTick((t) => t + 1),
  });

  if (!editor) return <EditorSkeleton />;

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
      <EditorLinkModal editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}

function EditorLinkModal({
  editor,
  open,
  onClose,
}: {
  editor: Editor;
  open: boolean;
  onClose: () => void;
}) {
  const existingHref: string | undefined = editor.getAttributes('link').href;
  const linkChain = () => editor.chain().focus().extendMarkRange('link');
  return (
    <LinkModal
      open={open}
      initialUrl={existingHref ?? 'https://'}
      hasExisting={Boolean(existingHref)}
      onClose={onClose}
      onSubmit={(url) => {
        linkChain().setLink({ href: url, target: '_blank' }).run();
        onClose();
      }}
      onRemove={() => {
        linkChain().unsetLink().run();
        onClose();
      }}
    />
  );
}

function EditorSkeleton() {
  return (
    <div className="px-6 py-8 space-y-3">
      <div className="skeleton h-5 w-full" />
      <div className="skeleton h-5 w-11/12" />
      <div className="skeleton h-5 w-4/5" />
      <div className="skeleton h-5 w-2/3" />
    </div>
  );
}
