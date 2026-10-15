import Logo from '@czyblog/ui/Logo';

// Split layout for unauthenticated pages: brand panel (when there's room) + form column.
export default function AuthShell({
  panel,
  children,
}: {
  /** Copy shown in the middle of the brand panel. */
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden lg:flex relative overflow-hidden bg-brand-panel text-on-brand p-12 flex-col justify-between border-r border-line">
        {/* Faint dot grid, fading out toward the copy. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="rounded-[30%] ring-1 ring-white/15">
            <Logo size={34} />
          </span>
          <span className="font-serif text-xl font-medium tracking-[-0.015em]">Czy Blog</span>
        </div>
        <div className="relative">{panel}</div>
        <div className="relative text-xs text-brand-muted">
          © {new Date().getFullYear()} Czy Blog
        </div>
      </aside>

      <section className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <Logo size={32} />
          <span className="font-serif text-xl font-medium tracking-[-0.015em]">Czy Blog</span>
        </div>
        {children}
      </section>
    </main>
  );
}
