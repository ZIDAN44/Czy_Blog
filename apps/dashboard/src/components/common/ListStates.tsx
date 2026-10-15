import type { LucideIcon } from 'lucide-react';

// The three non-data states every list card needs, so they look the same everywhere.

/** Placeholder rows while a list loads. */
export function ListSkeleton({ rows = 3, pill = true }: { rows?: number; pill?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="px-5 py-4 flex items-center gap-4 border-b border-line last:border-0"
        >
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-2/5" />
            <div className="skeleton h-3 w-1/4" />
          </div>
          {pill && <div className="skeleton h-5 w-20 rounded-full" />}
        </div>
      ))}
    </>
  );
}

/** A failure says what happened and offers the way out of it. */
export function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-5 py-14 text-center space-y-3">
      <p className="t-body">{message}</p>
      <button onClick={onRetry} className="btn btn-secondary">
        Try again
      </button>
    </div>
  );
}

/** Nothing to show yet, with an optional next step. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-16 text-center">
      {Icon && (
        <span className="mx-auto grid place-items-center w-11 h-11 rounded-xl bg-surface-sunken ring-1 ring-line text-content-tertiary">
          <Icon className="w-5 h-5" />
        </span>
      )}
      <p className={Icon ? 't-heading mt-4' : 't-body text-content-secondary'}>{title}</p>
      {hint && <p className="t-secondary mt-1">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
