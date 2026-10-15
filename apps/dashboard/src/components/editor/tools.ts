import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

// Declarative toolbar: each tool says how to detect its state and how to run.
// Grouped by effect (marks, structure, inserts, history); groups render with dividers.

export interface Tool {
  key: string;
  title: string;
  icon: LucideIcon;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const chain = (e: Editor) => e.chain().focus();

// Tools whose active state is just "is this mark/node at the cursor".
type SimpleTool = Omit<Tool, 'isActive'>;
const byKey = (t: SimpleTool): Tool => ({ isActive: (e) => e.isActive(t.key), ...t });

const MARKS: Tool[] = (
  [
    { key: 'bold', title: 'Bold (Ctrl+B)', icon: Bold, run: (e) => chain(e).toggleBold().run() },
    {
      key: 'italic',
      title: 'Italic (Ctrl+I)',
      icon: Italic,
      run: (e) => chain(e).toggleItalic().run(),
    },
    {
      key: 'strike',
      title: 'Strikethrough',
      icon: Strikethrough,
      run: (e) => chain(e).toggleStrike().run(),
    },
    { key: 'code', title: 'Inline code', icon: Code, run: (e) => chain(e).toggleCode().run() },
  ] satisfies SimpleTool[]
).map(byKey);

const heading = (level: 1 | 2 | 3, icon: LucideIcon): Tool => ({
  key: `h${level}`,
  title: `Heading ${level}`,
  icon,
  isActive: (e) => e.isActive('heading', { level }),
  run: (e) => chain(e).toggleHeading({ level }).run(),
});

const BLOCKS: Tool[] = [
  heading(1, Heading1),
  heading(2, Heading2),
  heading(3, Heading3),
  ...(
    [
      {
        key: 'bulletList',
        title: 'Bullet list',
        icon: List,
        run: (e) => chain(e).toggleBulletList().run(),
      },
      {
        key: 'orderedList',
        title: 'Numbered list',
        icon: ListOrdered,
        run: (e) => chain(e).toggleOrderedList().run(),
      },
      {
        key: 'blockquote',
        title: 'Quote',
        icon: Quote,
        run: (e) => chain(e).toggleBlockquote().run(),
      },
      {
        key: 'codeBlock',
        title: 'Code block',
        icon: SquareCode,
        run: (e) => chain(e).toggleCodeBlock().run(),
      },
    ] satisfies SimpleTool[]
  ).map(byKey),
];

const DIVIDER: Tool = {
  key: 'hr',
  title: 'Divider',
  icon: Minus,
  run: (e) => chain(e).setHorizontalRule().run(),
};

const HISTORY: Tool[] = [
  {
    key: 'undo',
    title: 'Undo',
    icon: Undo2,
    isDisabled: (e) => !e.can().undo(),
    run: (e) => chain(e).undo().run(),
  },
  {
    key: 'redo',
    title: 'Redo',
    icon: Redo2,
    isDisabled: (e) => !e.can().redo(),
    run: (e) => chain(e).redo().run(),
  },
];

/** Insert tools need component state (link dialog, upload), so the toolbar supplies them. */
export function toolGroups(inserts: Tool[]): Tool[][] {
  return [MARKS, BLOCKS, [...inserts, DIVIDER], HISTORY];
}
