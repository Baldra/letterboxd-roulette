import { useState } from 'react';
import type { SpinResponse } from '@lr/shared';

interface ResultCardProps {
  result: SpinResponse;
  onSpinAgain: () => void;
}

export function ResultCard({ result, onSpinAgain }: ResultCardProps) {
  const { film, list } = result;
  const [artworkFailed, setArtworkFailed] = useState(false);

  return (
    <section className="result-card" aria-live="polite">
      <div className="result-card__art">
        {film.artworkUrl && !artworkFailed ? (
          <img
            src={film.artworkUrl}
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