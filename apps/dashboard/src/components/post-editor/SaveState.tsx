/** Ongoing save status, exposed rather than left to guesswork. */
export default function SaveState({
  dirty,
  savedAt,
  busy,
}: {
  dirty: boolean;
  savedAt: Date | null;
  busy: boolean;
}) {
  if (busy) return <span className="t-caption whitespace-nowrap">Saving…</span>;
  if (dirty)
    return (
      <span className="t-caption inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden />
        Unsaved
      </span>
    );
  if (savedAt)
    return (
      <span className="t-caption inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
        Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
    );
  return null;
}
