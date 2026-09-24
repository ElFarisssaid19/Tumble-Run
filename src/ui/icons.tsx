/** Small inline SVG icons shared by the HUD, the level select and the end screen. */

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" />
    </svg>
  );
}

/**
 * Three stars with the first `count` lit. `bonus` marks the last lit star as the one earned by
 * collecting every coin.
 */
export function StarRow({
  count,
  bonus = false,
  className = '',
}: {
  count: number;
  bonus?: boolean;
  className?: string;
}) {
  return (
    <span className={`stars ${className}`} role="img" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <StarIcon
          key={n}
          className={`star${n <= count ? ' star--on' : ''}${bonus && n === count ? ' star--bonus' : ''}`}
        />
      ))}
    </span>
  );
}

export function CoinIcon() {
  return (
    <svg className="icon icon--coin" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9" />
    </svg>
  );
}

export function FlagIcon() {
  return (
    <svg className="icon icon--flag" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 21V4" />
      <path d="M6 4.5l12 4.2-12 4.3z" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg className="icon icon--line" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function RestartIcon() {
  return (
    <svg className="icon icon--line" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" />
    </svg>
  );
}

export function LevelsIcon() {
  return (
    <svg className="icon icon--line" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" />
    </svg>
  );
}
