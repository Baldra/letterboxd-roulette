import { useEffect, useRef, useState } from 'react';

interface BrandProps {
  spinning: boolean;
}

const SYMBOL = 32;
const PATTERN = 6;
const PERIOD = SYMBOL * PATTERN;
const TRACK_LEN = 16;

const REEL_BASES = [0, 1, 2];
const SPEEDS = [0.3, 0.36, 0.42];
const STAGGER = [0, 300, 600];
const LAND_MS = [420, 500, 580];
const SETTLE_MS = 300;

const TILE_CLASSES = ['brand__tile--one', 'brand__tile--two', 'brand__tile--three'];

const THEMED = [
  {
    id: 'diamond',
    node: <path d="M16 3 29 16 16 29 3 16Z" />,
    color: 'var(--lb-orange)',
  },
  {
    id: 'seven',
    node: (
      <text
        x="16"
        y="24"
        textAnchor="middle"
        fontFamily="-apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
        fontWeight="800"
        fontSize="22"
      >
        7
      </text>
    ),
    color: 'var(--lb-green)',
  },
  {
    id: 'bar',
    node: <rect x="5" y="9.5" width="22" height="13" rx="6.5" />,
    color: 'var(--lb-blue)',
  },
  {
    id: 'bell',
    node: (
      <g>
        <path d="M16 3c-4.6 0-7.6 3.5-7.6 7.7 0 2 .6 3.6 1.3 5.2.7 1.6 1.3 2.4 1.3 3.6 0 1-1.4 2.2-1.4 3.5h13.2c0-1.3-1.4-2.5-1.4-3.5 0-1.2.6-2 1.3-3.6.7-1.6 1.3-3.2 1.3-5.2C24.6 6.5 21.6 3 16 3Z" />
        <circle cx="16" cy="26.5" r="2.6" />
      </g>
    ),
    color: 'var(--lb-orange)',
  },
  {
    id: 'cherry',
    node: (
      <g>
        <path
          d="M11.5 15C13 10.5 15.5 8 19.5 6.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="20.2" r="5.2" />
        <circle cx="22.5" cy="20.4" r="5.2" />
      </g>
    ),
    color: 'var(--lb-green)',
  },
];

type Cell =
  | { kind: 'tile'; class: string }
  | { kind: 'sym'; sym: number };

function trackFor(base: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < TRACK_LEN; i++) {
    if (i % PATTERN === 0) {
      cells.push({ kind: 'tile', class: TILE_CLASSES[base] });
    } else {
      cells.push({ kind: 'sym', sym: (i % PATTERN) - 1 });
    }
  }
  return cells;
}

const TRACKS = REEL_BASES.map(trackFor);

function easeOutBack(t: number): number {
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function mod(n: number): number {
  return ((n % PERIOD) + PERIOD) % PERIOD;
}

export function Brand({ spinning }: BrandProps) {
  const [hit, setHit] = useState(false);
  const tracksRef = useRef<Array<HTMLElement | null>>([]);
  const offsetRef = useRef([0, 0, 0]);
  const prevSpinRef = useRef(false);
  const hitTimerRef = useRef<number | undefined>(undefined);

  const paint = () => {
    for (let i = 0; i < 3; i++) {
      const el = tracksRef.current[i];
      if (el) el.style.transform = `translateY(${-offsetRef.current[i]}px)`;
    }
  };

  useEffect(() => {
    if (typeof window.requestAnimationFrame !== 'function') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let raf = 0;

    if (spinning) {
      window.clearTimeout(hitTimerRef.current);
      setHit(false);
      let prev = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(now - prev, 100);
        prev = now;
        const o = offsetRef.current;
        for (let i = 0; i < 3; i++) {
          o[i] = Math.round(mod(o[i] + SPEEDS[i] * dt) / 2) * 2;
        }
        paint();
        raf = window.requestAnimationFrame(loop);
      };
      raf = window.requestAnimationFrame(loop);
      return () => window.cancelAnimationFrame(raf);
    }

    if (!prevSpinRef.current) return undefined;
    prevSpinRef.current = false;

    const stopAt = performance.now();
    const start = offsetRef.current.map((o) => mod(o));
    const travel = start.map((s) => {
      const d = (PERIOD - s) % PERIOD;
      return d === 0 ? PERIOD : d;
    });
    const done = [false, false, false];

    const loop = (now: number) => {
      const t = now - stopAt;
      let allDone = true;
      for (let i = 0; i < 3; i++) {
        if (done[i]) continue;
        allDone = false;
        const u = t - STAGGER[i];
        if (u < 0) {
          offsetRef.current[i] = mod(start[i] + SPEEDS[i] * u);
          continue;
        }
        const D = LAND_MS[i];
        const s = u - D;
        let o: number;
        if (u < D) {
          o = start[i] + travel[i] * easeOutBack(u / D);
        } else if (u < D + SETTLE_MS) {
          o = start[i] + travel[i] + 4 * Math.sin(s * 0.055) * Math.exp(-0.012 * s);
        } else {
          o = start[i] + travel[i];
          done[i] = true;
          continue;
        }
        offsetRef.current[i] = o;
      }
      paint();
      if (allDone) {
        setHit(true);
        hitTimerRef.current = window.setTimeout(() => setHit(false), 1050);
        return;
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [spinning]);

  useEffect(() => {
    if (spinning) prevSpinRef.current = true;
  }, [spinning]);

  useEffect(
    () => () => window.clearTimeout(hitTimerRef.current),
    [],
  );

  const className = ['brand', spinning ? 'brand--spinning' : '', hit ? 'brand--hit' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="img" aria-label="Letterboxd Roulette logo">
      <span className="brand__mark" aria-hidden="true">
        {TRACKS.map((track, i) => (
          <span className="brand__reel" key={i}>
            <span
              className="brand__reel-track"
              ref={(el) => {
                tracksRef.current[i] = el;
              }}
            >
              {track.map((cell, j) =>
                cell.kind === 'tile' ? (
                  <span className={`brand__tile ${cell.class}`} key={`${i}-${j}`} />
                ) : (
                  <svg
                    className="brand__sym"
                    viewBox="0 0 32 32"
                    style={{ fill: THEMED[cell.sym].color, color: THEMED[cell.sym].color }}
                    key={`${i}-${j}`}
                  >
                    {THEMED[cell.sym].node}
                  </svg>
                ),
              )}
            </span>
          </span>
        ))}
      </span>
      <span className="brand__wordmark">
        Letterboxd <span className="brand__wordmark-accent">Roulette</span>
      </span>
    </div>
  );
}