// Renders TipTap JSON to React. Mirrors the editor extensions in the dashboard's
// components/editor/BlockEditor.tsx, so the page matches what authors saw while writing.
import React from 'react';

// URLs in authored content are untrusted, and React doesn't block javascript:
// hrefs (stored XSS). The API checks these at write time; this is the second
// half, for documents that predate that check or arrive elsewhere.
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (v === '' || v.startsWith('//')) return undefined;
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return v;
  const colon = v.indexOf(':');
  const slash = v.indexOf('/');
  // No colon, or a colon inside the path: document-relative.
  if (colon === -1 || (slash !== -1 && slash < colon)) return v;
  try {
    return SAFE_SCHEMES.includes(new URL(v).protocol) ? v : undefined;
  } catch {
    return undefined;
  }
}

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: Mark[];
  text?: string;
};

function applyMarks(text: string, marks: Node['marks'], key: string): React.ReactNode {
  let node: React.ReactNode = text;
  for (const m of marks ?? []) {
    if (m.type === 'bold') node = <strong key={key}>{node}</strong>;
    else if (m.type === 'italic') node = <em key={key}>{node}</em>;
    else if (m.type === 'strike') node = <s key={key}>{node}</s>;
    else if (m.type === 'code') node = <code key={key}>{node}</code>;
    else if (m.type === 'link') {
      const href = safeUrl(m.attrs?.href);
      // An unusable href renders as plain text rather than as a dead link.
      node = href ? (
        <a
          key={key}
          href={href}
          // target from the document is constrained to same-tab or new-tab only.
          target={m.attrs?.target === '_self' ? '_self' : '_blank'}
          // noopener blocks window.opener; noreferrer keeps the reader's URL out of logs.
          rel="noopener noreferrer nofollow"
        >
          {node}
        </a>
      ) : (
        node
      );
    }
  }
  return node;
}

// Matches the API's stored limit: rendering recurses, so a deep doc would
// overflow the stack without a ceiling.
const MAX_RENDER_DEPTH = 30;

type Renderer = (node: Node, key: string, children: React.ReactNode[]) => React.ReactNode;

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const wrap =
  (tag: string): Renderer =>
  (_node, key, children) =>
    React.createElement(tag, { key }, children);

// One renderer per node type in the editor schema; unknown types render their children.
const RENDERERS: Record<string, Renderer> = {
  paragraph: wrap('p'),
  bulletList: wrap('ul'),
  orderedList: wrap('ol'),
  listItem: wrap('li'),
  blockquote: wrap('blockquote'),
  heading: (node, key, children) => {
    const lvl = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
    return React.createElement(`h${lvl}`, { key }, children);
  },
  codeBlock: (node, key, children) => (
    <pre key={key} data-lang={str(node.attrs?.language)}>
      <code>{children}</code>
    </pre>
  ),
  horizontalRule: (_node, key) => <hr key={key} />,
  hardBreak: (_node, key) => <br key={key} />,
  image: (node, key) => {
    const src = safeUrl(node.attrs?.src);
    if (!src) return null;
    return <img key={key} src={src} alt={str(node.attrs?.alt) ?? ''} loading="lazy" />;
  },
  text: (node, key) => applyMarks(node.text ?? '', node.marks, key),
};

function renderNode(node: Node, key: string, depth = 0): React.ReactNode {
  if (depth > MAX_RENDER_DEPTH) return null;
  const children = (node.content ?? []).map((c, i) => renderNode(c, `${key}.${i}`, depth + 1));
  const render = RENDERERS[node.type];
  return render ? (
    render(node, key, children)
  ) : (
    <React.Fragment key={key}>{children}</React.Fragment>
  );
}

export default function TiptapRender({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== 'object') return null;
  return <>{renderNode(doc as Node, 'r')}</>;
}
