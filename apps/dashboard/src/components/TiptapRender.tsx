// Renders TipTap JSON to React. Mirrors the editor extensions in Editor.tsx
// so the published page matches what authors saw while writing.
import React from 'react';

/**
 * Post content is authored by CONTRIBUTOR-level accounts and rendered on the
 * public page, so every URL that reaches an `href`/`src` here is untrusted.
 * React does not block `javascript:` URLs, so an unchecked `href` from the
 * document would be stored XSS against every reader. The API rejects these at
 * write time too — this is the second half of that check, for documents that
 * predate it or arrive from anywhere else.
 */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (v === '' || v.startsWith('//')) return undefined;
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return v;
  const colon = v.indexOf(':');
  const slash = v.indexOf('/');
  // No scheme at all, or a colon that sits inside the path: document-relative.
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
          // `target` comes from the document, so it is not free-form: the only
          // choice offered is same-tab or new-tab.
          target={m.attrs?.target === '_self' ? '_self' : '_blank'}
          // noopener keeps the opened page from reaching back through
          // window.opener; noreferrer keeps the reader's URL out of its logs.
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

// Matches the limit the API enforces on stored documents. Rendering is
// recursive, so without a ceiling a deep document takes the page down with a
// stack overflow instead of just looking odd.
const MAX_RENDER_DEPTH = 30;

function renderNode(node: Node, key: string, depth = 0): React.ReactNode {
  if (depth > MAX_RENDER_DEPTH) return null;
  const children = (node.content ?? []).map((c, i) => renderNode(c, `${key}.${i}`, depth + 1));
  switch (node.type) {
    case 'doc':
      return <>{children}</>;
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading': {
      const lvl = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      return React.createElement(`h${lvl}`, { key }, children);
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return <ol key={key}>{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock':
      return (
        <pre
          key={key}
          data-lang={typeof node.attrs?.language === 'string' ? node.attrs.language : undefined}
        >
          <code>{children}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} />;
    case 'hardBreak':
      return <br key={key} />;
    case 'image': {
      const src = safeUrl(node.attrs?.src);
      if (!src) return null;
      return (
        <img
          key={key}
          src={src}
          alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''}
          loading="lazy"
        />
      );
    }
    case 'text':
      return applyMarks(node.text ?? '', node.marks, key);
    default:
      return <>{children}</>;
  }
}

export default function TiptapRender({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== 'object') return null;
  return <>{renderNode(doc as Node, 'r')}</>;
}
