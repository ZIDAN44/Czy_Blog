import { initials } from '@/lib/utils';

export default function UserAvatar({ name }: { name?: string }) {
  return (
    <span className="grid place-items-center w-8 h-8 shrink-0 rounded-full bg-accent-soft text-accent-content text-xs font-semibold">
      {initials(name)}
    </span>
  );
}
