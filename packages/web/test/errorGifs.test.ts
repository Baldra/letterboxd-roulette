import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyError, localGifUrl, randomGifUrl } from '../src/errorGifs';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('classifyError', () => {
  it('maps known statuses to reason keys', () => {
    expect(classifyError(400)).toBe('invalid-input');
    expect(classifyError(404)).toBe('not-found');
    expect(classifyError(422)).toBe('empty-or-private');
    expect(classifyError(429)).toBe('rate-limited');
    expect(classifyError(502)).toBe('upstream');
    expect(classifyError(503)).toBe('upstream');
  });

  it('maps unknown and network statuses to offline', () => {
    expect(classifyError(0)).toBe('offline');
    expect(classifyError(500)).toBe('offline');
  });
});

describe('localGifUrl', () => {
  it('points at the bundled gif per reason', () => {
    expect(localGifUrl('not-found')).toBe('/gifs/not-found.gif');
    expect(localGifUrl('offline')).toBe('/gifs/offline.gif');
  });
});

describe('randomGifUrl', () => {
  it('requests the reason endpoint and returns the remote url on success', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ url: 'https://media.giphy.com/x.gif' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const url = await randomGifUrl('not-found', 2000);
    expect(url).toBe('https://media.giphy.com/x.gif');
    expect(fetchMock).toHaveBeenCalledWith('/api/gif?reason=not-found', expect.anything());
  });

  it('returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    expect(await randomGifUrl('upstream', 2000)).toBeNull();
  });

  it('returns null when the underlying fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    expect(await randomGifUrl('offline', 2000)).toBeNull();
  });
});