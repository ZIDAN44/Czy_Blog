// Shared page title row: heading + description on the left, actions on the right.
export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 mb-8 border-b border-line">
      <div className="min-w-0">
        {eyebrow && <div className="t-secondary mb-1">{eyebrow}</div>}
        <h1 className="t-title">{title}</h1>
        {description && <p className="t-secondary mt-1.5 max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
