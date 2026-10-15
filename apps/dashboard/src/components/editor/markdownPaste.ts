import type { EditorView } from '@tiptap/pm/view';
import { DOMParser as PMDOMParser, type Schema } from '@tiptap/pm/model';
import { marked } from 'marked';

// Plain-text paste that looks like Markdown is converted to rich content.

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

/** ProseMirror `handlePaste`: true when the paste was handled here. */
export function handleMarkdownPaste(view: EditorView, event: ClipboardEvent): boolean {
  const html = event.clipboardData?.getData('text/html');
  if (html && html.trim()) return false; // rich paste: let the editor handle it
  const text = event.clipboardData?.getData('text/plain');
  if (!text || !looksLikeMarkdown(text)) return false;
  try {
    const slice = htmlToSlice(mdToHtml(text), view.state.schema);
    view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
    return true;
  } catch {
    return false;
  }
}
