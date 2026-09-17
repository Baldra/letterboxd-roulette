import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SpinResponse } from '@lr/shared';
import { ResultCard } from '../src/components/ResultCard';
import { messageForStatus } from '../src/errorMessages';

afterEach(cleanup);

const result: SpinResponse = {
  film: {
    title: 'The Captive',
    year: '2000',
    slug: 'the-captive',
    url: 'https://letterboxd.com/film/the-captive/',
    artworkUrl: 'https://a.ltrbxd.com/resized/x.jpg',
  },
  list: {
    owner: 'username',
    url: 'https://letterboxd.com/username/watchlist/',
    count: 160,
    label: "username's Watchlist",
  },
};

describe('ResultCard', () => {
  it('renders a successful spin response', () => {
    render(<ResultCard result={result} onSpinAgain={() => {}} />);
    expect(screen.getByText(/The Captive/)).toBeTruthy();
    expect(screen.getByText('2000')).toBeTruthy();
    expect(screen.getByText(/username's Watchlist/)).toBeTruthy();
    expect(screen.getByText(/160 films/)).toBeTruthy();
    const link = screen.getByRole('link', { name: /Open on Letterboxd/ });
    expect(link.getAttribute('href')).toBe(result.film.url);
    expect(screen.getByRole('button', { name: /Spin again/ })).toBeTruthy();
    const img = screen.getByAltText('The Captive poster');
    expect(img.getAttribute('src')).toBe(result.film.artworkUrl);
  });

  it('falls back to a styled placeholder when the artwork fails to load', () => {
    const { container } = render(<ResultCard result={result} onSpinAgain={() => {}} />);
    const img = screen.getByAltText('The Captive poster');
    fireEvent.error(img);
    expect(screen.queryByAltText('The Captive poster')).toBeNull();
    expect(container.querySelector('.result-card__placeholder')?.textContent).toBe('The Captive');
  });

  it('renders the placeholder directly when artwork is missing', () => {
    const noArt: SpinResponse = {
      ...result,
      film: { ...result.film, artworkUrl: undefined },
    };
    const { container } = render(<ResultCard result={noArt} onSpinAgain={() => {}} />);
    expect(screen.queryByAltText('The Captive poster')).toBeNull();
    expect(container.querySelector('.result-card__placeholder')?.textContent).toBe('The Captive');
  });

  it('triggers spin again via the button', () => {
    const onSpinAgain = vi.fn();
    render(<ResultCard result={result} onSpinAgain={onSpinAgain} />);
    fireEvent.click(screen.getByRole('button', { name: /Spin again/ }));
    expect(onSpinAgain).toHaveBeenCalledTimes(1);
  });
});

describe('messageForStatus', () => {
  const UNIFIED = "Nothing found — the list may be empty, private, or doesn't exist.";

  it('uses the single unified message for every non-rate-limit failure', () => {
    for (const status of [400, 404, 422, 502, 503, 0]) {
      expect(messageForStatus(status)).toBe(UNIFIED);
    }
  });

  it('ignores server detail for unified failures even when the API supplies an error', () => {
    expect(messageForStatus(404, 'List not found')).toBe(UNIFIED);
  });

  it('keeps the rate-limit message distinct for 429', () => {
    expect(messageForStatus(429)).toBe('Too many spins! Wait a moment, then try again.');
  });
});