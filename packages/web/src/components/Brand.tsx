interface BrandProps {
  spinning: boolean;
}

export function Brand({ spinning }: BrandProps) {
  return (
    <div
      className={spinning ? 'brand brand--spinning' : 'brand'}
      role="img"
      aria-label="Letterboxd Roulette logo"
    >
      <svg className="brand__mark" viewBox="0 0 64 96" aria-hidden="true">
        <g className="brand__reel">
          <circle className="brand__tile brand__tile--one" cx="32" cy="16" r="14" />
          <circle className="brand__tile brand__tile--two" cx="32" cy="48" r="14" />
          <circle className="brand__tile brand__tile--three" cx="32" cy="80" r="14" />
        </g>
      </svg>
      <span className="brand__wordmark">
        Letterboxd <span className="brand__wordmark-accent">Roulette</span>
      </span>
    </div>
  );
}