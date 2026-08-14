import { z } from 'zod';

/**
 * Validation for block-editor (Tiptap/ProseMirror) documents.
 *
 * The previous schema accepted `{ type: 'doc', content: z.any()[] }`, which put
 * arbitrary attacker-controlled JSON into a column that is later rendered into
 * the public page. Two separate problems come out of that:
 *
 *  1. URL-bearing attributes (`href`, `src`) could hold `javascript:` or
 *     `data:text/html` and become stored XSS in whatever renders them.
 *  2. Nothing bounded the document, so a single request could persist a
 *     structure deep or wide enough to blow the stack of any recursive
 *     renderer, or to make every read of that post expensive.
 *
 * So the document is validated against the node/mark vocabulary the editor and
 * the renderer actually implement, with hard structural limits. The walk below
 * is iterative on purpose — validating deeply nested input must not itself
 * recurse.
 */

const MAX_DEPTH = 30;
const MAX_NODES = 10_000;
const MAX_TEXT_LENGTH = 50_000;
const MAX_MARKS_PER_NODE = 16;
const MAX_ATTR_STRING = 2048;

// Node types the renderer knows how to draw. Anything else is rejected rather
// than silently stored and then dropped (or worse, rendered) at read time.
const NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'image',
]);

const MARK_TYPES = new Set(['bold', 'italic', 'strike', 'code', 'link']);

// Attribute keys carrying a URL. These get a scheme allowlist; everything else
// is length-bounded only.
const URL_ATTRS = new Set(['src', 'href']);

// Relative paths are fine (`/uploads/x.webp`); absolute URLs must be http(s).
// Protocol-relative (`//host`) is excluded because its scheme is inherited.
function isSafeUrl(value: string): boolean {
  const v = value.trim();
  if (v === '') return false;
  if (v.startsWith('//')) return false;
  if (v.startsWith('/') || v.startsWith('#') || v.startsWith('?')) return true;
  // No scheme separator at all means a document-relative path (`img/a.png`).
  // A colon appearing only after the first `/` is part of the path, not a scheme.
  const colon = v.indexOf(':');
  if (colon === -1) return true;
  const slash = v.indexOf('/');
  if (slash !== -1 && slash < colon) return true;
  try {
    const scheme = new URL(v).protocol;
    return scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:';
  } catch {
    return false;
  }
}

type Issue = { path: (string | number)[]; message: string };

function checkAttrs(attrs: unknown, path: (string | number)[], issues: Issue[]): void {
  if (attrs === undefined || attrs === null) return;
  if (typeof attrs !== 'object' || Array.isArray(attrs)) {
    issues.push({ path: [...path, 'attrs'], message: 'attrs must be an object' });
    return;
  }
  for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
    const at = [...path, 'attrs', key];
    if (value === null || typeof value === 'number' || typeof value === 'boolean') continue;
    if (typeof value !== 'string') {
      issues.push({ path: at, message: 'attribute must be a string, number, boolean or null' });
      continue;
    }
    if (value.length > MAX_ATTR_STRING) {
      issues.push({ path: at, message: `attribute exceeds ${MAX_ATTR_STRING} characters` });
      continue;
    }
    if (URL_ATTRS.has(key) && !isSafeUrl(value)) {
      issues.push({ path: at, message: 'URL must be relative or use http, https or mailto' });
    }
  }
}

function checkMarks(marks: unknown, path: (string | number)[], issues: Issue[]): void {
  if (marks === undefined || marks === null) return;
  if (!Array.isArray(marks)) {
    issues.push({ path: [...path, 'marks'], message: 'marks must be an array' });
    return;
  }
  if (marks.length > MAX_MARKS_PER_NODE) {
    issues.push({
      path: [...path, 'marks'],
      message: `too many marks (max ${MAX_MARKS_PER_NODE})`,
    });
    return;
  }
  marks.forEach((mark, i) => {
    const at = [...path, 'marks', i];
    if (!mark || typeof mark !== 'object' || Array.isArray(mark)) {
      issues.push({ path: at, message: 'mark must be an object' });
      return;
    }
    const m = mark as { type?: unknown; attrs?: unknown };
    if (typeof m.type !== 'string' || !MARK_TYPES.has(m.type)) {
      issues.push({ path: [...at, 'type'], message: `unsupported mark type` });
      return;
    }
    checkAttrs(m.attrs, at, issues);
  });
}

function validateDoc(doc: unknown, issues: Issue[]): void {
  let nodeCount = 0;
  const stack: { node: unknown; path: (string | number)[]; depth: number }[] = [
    { node: doc, path: [], depth: 0 },
  ];

  while (stack.length > 0) {
    const { node, path, depth } = stack.pop()!;

    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      issues.push({ path, message: 'node must be an object' });
      continue;
    }
    if (++nodeCount > MAX_NODES) {
      issues.push({ path: [], message: `document has too many nodes (max ${MAX_NODES})` });
      return;
    }
    if (depth > MAX_DEPTH) {
      issues.push({ path, message: `document nested too deeply (max ${MAX_DEPTH})` });
      return;
    }

    const n = node as {
      type?: unknown;
      text?: unknown;
      content?: unknown;
      attrs?: unknown;
      marks?: unknown;
    };
    if (typeof n.type !== 'string' || !NODE_TYPES.has(n.type)) {
      issues.push({ path: [...path, 'type'], message: 'unsupported node type' });
      continue;
    }
    if (depth === 0 && n.type !== 'doc') {
      issues.push({ path: ['type'], message: 'root node must be a doc' });
      continue;
    }

    if (n.type === 'text') {
      if (typeof n.text !== 'string') {
        issues.push({ path: [...path, 'text'], message: 'text node requires a text string' });
      } else if (n.text.length > MAX_TEXT_LENGTH) {
        issues.push({
          path: [...path, 'text'],
          message: `text exceeds ${MAX_TEXT_LENGTH} characters`,
        });
      }
    }

    checkAttrs(n.attrs, path, issues);
    checkMarks(n.marks, path, issues);

    if (n.content !== undefined) {
      if (!Array.isArray(n.content)) {
        issues.push({ path: [...path, 'content'], message: 'content must be an array' });
        continue;
      }
      for (let i = n.content.length - 1; i >= 0; i--) {
        stack.push({ node: n.content[i], path: [...path, 'content', i], depth: depth + 1 });
      }
    }
  }
}

export type BlockDoc = { type: 'doc'; content: unknown[] };

export const blockDocSchema = z
  .object({ type: z.literal('doc'), content: z.array(z.unknown()) })
  .loose()
  .superRefine((doc, ctx) => {
    const issues: Issue[] = [];
    validateDoc(doc, issues);
    for (const issue of issues.slice(0, 20)) {
      ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    }
  });
