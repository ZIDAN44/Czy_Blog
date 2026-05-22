// Renders TipTap JSON to React. Mirrors the editor extensions in Editor.tsx
// so the published page matches what authors saw while writing.
import React from 'react';

type Node = {
  type: string;
  attrs?: Record<string, any>;
  content?: Node[];
  marks?: { type: string; attrs?: Record<string, any> }[];
  text?: string;
};

function applyMarks(text: string, marks: Node['marks'], key: string): React.ReactNode {
  let node: React.ReactNode = text;
  for (const m of marks ?? []) {
    if (m.type === 'bold') node = <strong key={key}>{node}</strong>;
    else if (m.type === 'italic') node = <em key={key}>{node}</em>;
    else if (m.type === 'strike') node = <s key={key}>{node}</s>;
    else if (m.type === 'code') node = <code key={key}>{node}</code>;
    else if (m.type === 'link')
      node = (
        <a key={key} href={m.attrs?.href} target={m.attrs?.target ?? '_blank'} rel="noreferrer">
          {node}
        </a>
      );
  }
  return node;
}

function renderNode(node: Node, key: string): React.ReactNode {
  const children = (node.content ?? []).map((c, i) => renderNode(c, `${key}.${i}`));
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
        <pre key={key} data-lang={node.attrs?.language}>
          <code>{children}</code>
        </pre>
      );
    case 'horizontalRule':
      return <hr key={key} />;
    case 'hardBreak':
      return <br key={key} />;
    case 'image':
      return <img key={key} src={node.attrs?.src} alt={node.attrs?.alt ?? ''} />;
    case 'text':
      return applyMarks(node.text ?? '', node.marks, key);
    default:
      return <>{children}</>;
  }
}

export default function TiptapRender({ doc }: { doc: any }) {
  if (!doc || typeof doc !== 'object') return null;
  return <>{renderNode(doc as Node, 'r')}</>;
}
