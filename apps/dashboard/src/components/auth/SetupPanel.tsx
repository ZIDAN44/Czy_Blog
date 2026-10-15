import { Check } from 'lucide-react';

const STEPS = [
  'This account becomes the super admin.',
  'Invite editors, authors, and contributors.',
  'Write, schedule, and publish from one place.',
];

// Brand-panel copy for the first-run signup screen.
export default function SetupPanel() {
  return (
    <div className="max-w-md">
      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-white/10 ring-1 ring-white/15">
        First-run setup
      </span>
      <h2 className="font-serif text-[2.75rem] leading-[1.08] tracking-[-0.025em] mt-5">
        Set up your blog.
      </h2>
      <ul className="mt-8 space-y-3">
        {STEPS.map((s) => (
          <li key={s} className="flex items-start gap-3 text-[0.9375rem] text-brand-muted">
            <span className="grid place-items-center w-5 h-5 mt-0.5 rounded-full bg-white/10 text-on-brand shrink-0">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
