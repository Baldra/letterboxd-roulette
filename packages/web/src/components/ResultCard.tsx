import { useEffect, useState } from 'react';
import type { SpinResponse } from '@lr/shared';

interface ResultCardProps {
  result: SpinResponse;
  onSpinAgain: () => void;
}

const POLL_INTERVAL_MS = 300;
const MAX_ATTEMPTS = 3;

export function ResultCard({ result, onSpinAgain }: ResultCardProps) {
  const { film, list } = result;
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState(film.artworkUrl ?? null);

  useEffect(() => {
    if (artworkUrl) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch(`/api/artwork?slug=${encodeURIComponent(film.slug)}`);
        if (res.ok) {
          const data = (await res.json()) as { artworkUrl: string | null };
          if (data.artworkUrl) {
            setArtworkUrl(data.artworkUrl);
            return;
          }
        }
      } catch {
        // ignore poll errors
      }
      if (attempts < MAX_ATTEMPTS) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [film.slug, artworkUrl]);

  return (
    <section className="result-card" aria-live="polite">
      <div className="result-card__art">
        {artworkUrl && !artworkFailed ? (
          <img
            src={artworkUrl}
            alt={`${film.title} poster`}
            onError={() => setArtworkFailed(true)}
            loading="lazy"
          />
        ) : (
          <div className="result-card__placeholder">{film.title}</div>
        )}
      </div>

      <h2 className="result-card__title">
        {film.title} <span className="result-card__year">{film.year}</span>
      </h2>

      <p className="result-card__list">
        from <strong>{list.label}</strong> &middot; {list.count} film{list.count === 1 ? '' : 's'}
      </p>

      <div className="result-card__actions">
        <a className="result-card__link result-card__link--external" href={film.url} target="_blank" rel="noreferrer">
          Open on Letterboxd
        </a>
        <button type="button" className="result-card__link result-card__link--again" onClick={onSpinAgain}>
          Spin again
        </button>
      </div>
    </section>
  );
}