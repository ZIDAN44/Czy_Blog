type Props = {
  className?: string;
  title?: string;
};

export default function Logo({ className, title = 'Czy Blog' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <g fontFamily="'Playfair Display', Didot, 'Bodoni 72', Georgia, 'Times New Roman', serif">
        <text x="-2" y="54" fontSize="68" fontWeight="400" fill="currentColor">
          C
        </text>
        <text x="20" y="42" fontSize="40" fontWeight="700" fontStyle="italic" fill="#C9A24B">
          Z
        </text>
        <text x="34" y="60" fontSize="40" fontStyle="italic" fill="currentColor">
          y
        </text>
      </g>
    </svg>
  );
}
