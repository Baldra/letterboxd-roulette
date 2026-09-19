import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../src/lib/cache.js';
import { TMDBArtworkProvider } from '../src/lib/tmdb-provider.js';

const API_KEY = 'test-tmdb-key';
const POSTER_PATH = '/abc123.jpg';
const POSTER_URL = 'https://image.tmdb.org/t/p/w500/abc123.jpg';

function tmdbBody(results: Array<{ id: number; poster_path: string | null }>): string {
  return JSON.stringify({ results });
}

function mockTMDB(status = 200, results: Array<{ id: number; poster_path: string | null }> = []): {
  calls: string[];
  fetchImpl: typeof fetch;
} {
  const calls: string[] = [];
  const fetchImpl = async (url: string | URL | Request): Promise<Response> => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    calls.push(u);
    if (status !== 200) return new Response('{}', { status });
    return new Response(tmdbBody(results), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { calls, fetchImpl };
}

test('returns poster URL for a successful search', async () => {
  const mock = mockTMDB(200, [{ id: 1, poster_path: POSTER_PATH }]);
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, POSTER_URL);
  assert.equal(mock.calls.length, 1);
  const call = mock.calls[0]!;
  assert.ok(call.includes('query=The+Godfather'));
  assert.ok(call.includes('year=1972'));
});

test('falls back to title-only search when year search returns no results', async () => {
  const calls: string[] = [];
  const fetchImpl = async (url: string | URL | Request): Promise<Response> => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    calls.push(u);
    if (calls.length === 1) {
      return new Response(tmdbBody([]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(tmdbBody([{ id: 2, poster_path: POSTER_PATH }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, POSTER_URL);
  assert.equal(calls.length, 2, 'two searches: title+year, then title-only');
  const secondCall = new URL(calls[1]!);
  assert.equal(secondCall.searchParams.get('year'), null, 'second call omits year');
});

test('returns undefined when both searches return no results', async () => {
  const mock = mockTMDB(200, []);
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const url = await provider.fetchArt('Nonexistent Film', '2025');
  assert.equal(url, undefined);
  assert.equal(mock.calls.length, 2, 'both searches attempted');
});

test('returns undefined without fetching when no API key is configured', async () => {
  const mock = mockTMDB();
  const provider = new TMDBArtworkProvider({ apiKey: '', fetchImpl: mock.fetchImpl });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, undefined);
  assert.equal(mock.calls.length, 0);
});

test('returns undefined on network error without throwing', async () => {
  const fetchImpl = async () => {
    throw new Error('network down');
  };
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, undefined);
});

test('returns undefined on upstream failure without throwing', async () => {
  const mock = mockTMDB(500);
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, undefined);
});

test('returns undefined when result has no poster_path', async () => {
  const mock = mockTMDB(200, [{ id: 3, poster_path: null }]);
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, undefined);
});

test('uses configurable poster size', async () => {
  const mock = mockTMDB(200, [{ id: 4, poster_path: POSTER_PATH }]);
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl, posterSize: 'w342' });
  const url = await provider.fetchArt('The Godfather', '1972');
  assert.equal(url, 'https://image.tmdb.org/t/p/w342/abc123.jpg');
});

test('caches search results to avoid repeat fetches', async () => {
  const mock = mockTMDB(200, [{ id: 5, poster_path: POSTER_PATH }]);
  const cache = new TtlCache<{ url: string }>();
  const provider = new TMDBArtworkProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl, cache });
  const first = await provider.fetchArt('The Godfather', '1972');
  const second = await provider.fetchArt('The Godfather', '1972');
  assert.equal(first, POSTER_URL);
  assert.equal(second, POSTER_URL);
  assert.equal(mock.calls.length, 1, 'only one request made due to caching');
});
