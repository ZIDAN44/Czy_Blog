export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatDate(iso: string | null, month: 'short' | 'long' = 'short'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month, day: 'numeric' });
}

type TextNode = { text?: string; content?: TextNode[] };

// ~225 wpm; walks the TipTap tree rather than regexing its JSON.
export function readingMinutes(doc: unknown): number {
  let words = 0;
  const walk = (n: TextNode, depth: number) => {
    if (depth > 30) return;
    if (n.text) words += n.text.split(/\s+/).filter(Boolean).length;
    n.content?.forEach((c) => walk(c, depth + 1));
  };
  if (doc && typeof doc === 'object') walk(doc as TextNode, 0);
  return Math.max(1, Math.round(words / 225));
}
