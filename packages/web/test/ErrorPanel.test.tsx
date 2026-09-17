import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ErrorPanel } from '../src/components/ErrorPanel';
import { messageForStatus } from '../src/errorMessages';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const REMOTE = 'https://media.giphy.com/media/xyz/giphy.gif';

function stubApi(url = REMOTE, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ url }), { status })),
  );
}

describe('ErrorPanel', () => {
  it('shows the local GIF first, then swaps in the remote GIF on API success', async () => {
    stubApi();
    render(<ErrorPanel status={404} message="User not found." />);
    const img = screen.getByAltText('Movie-themed illustration for not found');
    expect(img.getAttribute('src')).toBe('/gifs/not-found.gif');
    await waitFor(() => {
      expect(screen.getByAltText('Movie-themed illustration for not found').getAttribute('src')).toBe(REMOTE);
    });
    expect(screen.getByText('User not found.')).toBeTruthy();
  });

  it('keeps the local GIF when the API is unavailable', async () => {
    stubApi(undefined, 503);
    render(<ErrorPanel status={422} message="That list is private or empty." />);
    const img = screen.getByAltText('Movie-themed illustration for empty or private');
    expect(img.getAttribute('src')).toBe('/gifs/empty-or-private.gif');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(screen.getByAltText('Movie-themed illustration for empty or private').getAttribute('src')).toBe(
      '/gifs/empty-or-private.gif',
    );
  });

  it('falls back to the local GIF when the remote image fails to load', async () => {
    stubApi();
    render(<ErrorPanel status={429} message="Too many spins!" />);
    await waitFor(() => {
      expect(screen.getByAltText('Movie-themed illustration for rate limited').getAttribute('src')).toBe(REMOTE);
    });
    fireEvent.error(screen.getByAltText('Movie-themed illustration for rate limited'));
    expect(screen.getByAltText('Movie-themed illustration for rate limited').getAttribute('src')).toBe(
      '/gifs/rate-limited.gif',
    );
  });

  it('drops to message-only when the local GIF also fails to load', () => {
    stubApi(undefined, 503);
    render(<ErrorPanel status={400} message="Malformed query." />);
    const img = screen.getByAltText('Movie-themed illustration for invalid input');
    fireEvent.error(img);
    expect(screen.queryByAltText('Movie-themed illustration for invalid input')).toBeNull();
    expect(screen.getByText('Malformed query.')).toBeTruthy();
  });

  it('exposes the error via an alert region', () => {
    stubApi(undefined, 503);
    render(<ErrorPanel status={0} message={messageForStatus(0)} />);
    expect(screen.getByRole('alert').textContent).toMatch(/Nothing found — the list may be empty, private, or doesn't exist/);
  });

  it('renders the unified copy for a not-found failure', () => {
    stubApi(undefined, 503);
    render(<ErrorPanel status={404} message={messageForStatus(404)} />);
    expect(screen.getByText(/Nothing found — the list may be empty, private, or doesn't exist/)).toBeTruthy();
  });

  it('renders the rate-limit copy separately for a 429 failure', () => {
    stubApi(undefined, 503);
    render(<ErrorPanel status={429} message={messageForStatus(429)} />);
    expect(screen.getByText(/Too many spins! Wait a moment, then try again/)).toBeTruthy();
  });

  it('renders the GIF panel in the theme palette', () => {
    stubApi(undefined, 503);
    const { container } = render(<ErrorPanel status={400} message={messageForStatus(400)} />);
    expect(container.querySelector('.error')).toBeTruthy();
    const gif = container.querySelector('.error__gif');
    expect(gif?.getAttribute('src')).toBe('/gifs/invalid-input.gif');
  });
});