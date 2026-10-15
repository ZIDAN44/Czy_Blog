type Props = {
  size?: number;
  className?: string;
  title?: string;
};

// Monogram tile in the loaded serif, so it renders the same on every platform.
export default function Logo({ size = 28, className = '', title = 'Czy Blog' }: Props) {
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-grid place-items-center shrink-0 rounded-[30%] bg-inverse text-on-inverse font-serif italic font-medium select-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.56, lineHeight: 1 }}
    >
      <span aria-hidden className="-translate-y-[4%] tracking-[-0.04em]">
        C<span className="text-[#d9a94e]">z</span>
      </span>
    </span>
  );
}
