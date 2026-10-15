'use client';
import type { Editor } from '@tiptap/react';
import { ImagePlus, Link2, Loader2 } from 'lucide-react';
import { toolGroups, type Tool } from './tools';
import { useImageUpload } from './useImageUpload';

export default function Toolbar({
  editor,
  onOpenLink,
}: {
  editor: Editor;
  onOpenLink: () => void;
}) {
  const { uploading, pickAndUpload } = useImageUpload(editor);

  const inserts: Tool[] = [
    {
      key: 'link',
      title: 'Link (Ctrl+K)',
      icon: Link2,
      isActive: (e) => e.isActive('link'),
      run: onOpenLink,
    },
    {
      key: 'image',
      title: uploading ? 'Uploading image…' : 'Insert image',
      icon: uploading ? Loader2 : ImagePlus,
      isDisabled: () => uploading,
      run: pickAndUpload,
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="chrome sticky top-14 lg:top-0 z-10 flex items-center gap-0.5 px-3 sm:px-6 py-1.5 border-y !border-line overflow-x-auto"
    >
      {toolGroups(inserts).map((group, i) => (
        <div key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="w-px h-5 bg-line-strong mx-1.5" aria-hidden />}
          {group.map((tool) => (
            <ToolButton
              key={tool.key}
              tool={tool}
              editor={editor}
              spinning={tool.key === 'image' && uploading}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ToolButton({ tool, editor, spinning }: { tool: Tool; editor: Editor; spinning: boolean }) {
  const active = tool.isActive?.(editor) ?? false;
  const Icon = tool.icon;
  return (
    <button
      type="button"
      title={tool.title}
      aria-label={tool.title}
      aria-pressed={active}
      disabled={tool.isDisabled?.(editor)}
      onClick={() => tool.run(editor)}
      className={`grid place-items-center w-8 h-8 shrink-0 rounded-md disabled:opacity-30 ${
        active
          ? 'bg-fill-active text-content'
          : 'text-content-secondary hover:bg-fill-hover hover:text-content'
      }`}
    >
      <Icon
        className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
        strokeWidth={active ? 2.4 : 2}
      />
    </button>
  );
}
