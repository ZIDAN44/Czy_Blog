import { initials } from '@/lib/utils';

const SIZE = { sm: 'w-9 h-9', md: 'w-10 h-10', lg: 'w-11 h-11' } as const;

export default function AuthorAvatar({
  name,
  url,
  size = 'sm',
  className = 'bg-surface-sunken',
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZE;
  /** Ground colour for the initials fallback. */
  className?: string;
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className={`${SIZE[size]} shrink-0 rounded-full object-cover ring-1 ring-line`}
    />
  ) : (
    <span
      className={`grid place-items-center ${SIZE[size]} shrink-0 rounded-full ${className} ring-1 ring-line text-xs font-semibold text-content-secondary`}
    >
      {initials(name)}
    </span>
  );
}
