type LogoProps = {
  size?: number;
  withWordmark?: boolean;
  className?: string;
};

export function Logo({ size = 32, withWordmark = false, className }: LogoProps) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="64" height="64" rx="14" fill="#0064E0" />
        <g fill="#FFFFFF">
          <rect x="18" y="14" width="8" height="36" rx="1.5" />
          <rect x="18" y="14" width="28" height="8" rx="1.5" />
          <path d="M28 27 L41 33.5 L28 40 Z" />
        </g>
      </svg>
      {withWordmark && (
        <span
          style={{
            fontWeight: 600,
            fontSize: size * 0.62,
            letterSpacing: '-0.02em',
            color: 'var(--color-charcoal)',
          }}
        >
          FFmcpeg
        </span>
      )}
    </span>
  );
}
