import Logo from '@/components/Logo';

/**
 * The split layout both unauthenticated pages sit in: a brand panel that only
 * appears when there is room for it, and a centred column for the form.
 *
 * Only the gradient and the panel's copy differ between sign-in and first-run
 * setup, so those are the props — the chrome around them is stated once.
 */
export default function AuthShell({
  gradient,
  panel,
  children,
}: {
  /** CSS `background` for the panel wash. */
  gradient: string;
  /** Copy shown in the middle of the brand panel. */
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex relative overflow-hidden bg-brand-panel text-on-brand border-r border-line p-12 flex-col justify-between">
        <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: gradient }} />
        <div className="relative flex items-center gap-2.5">
          <Logo className="w-9 h-9 text-on-brand" />
          <span className="font-semibold tracking-tight text-lg">Czy Blog</span>
        </div>
        {panel}
        <div className="relative text-xs text-brand-muted">© Czy Blog</div>
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-10">{children}</section>
    </main>
  );
}
