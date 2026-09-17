import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import { TtlCache } from '../src/lib/cache.js';
import { GiphyGifProvider, GIF_REASONS, type GifReason, queryForReason } from '../src/lib/gif-provider.js';

const GIPHY_URL = 'https://media.giphy.com/media/abc/giphy.gif';
const API_KEY = 'test-secret-key';

let originalKey: string | undefined;
afterEach(() => {
  process.env.GIPHY_API_KEY = originalKey;
});

function giphyBody(url: string): string {
  return JSON.stringify({ data: [{ images: { fixed_height: { url } } }] });
}

interface Mock {
  calls: string[];
  fetchImpl: typeof fetch;
}

function mockGiphy(status = 200): Mock {
  const calls: string[] = [];
  const fetchImpl = async (url: string | URL | Request): Promise<Response> => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    calls.push(u);
    if (status !== 200) return new Response('{}', { status });
    return new Response(giphyBody(GIPHY_URL), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { calls, fetchImpl };
}

test('reason keys map to distinct movie-keyword search queries', () => {
  assert.equal(GIF_REASONS.length, 6);
  const queries = new Set(GIF_REASONS.map((r) => queryForReason(r)));
  assert.equal(queries.size, 6, 'every reason maps to its own query');
  for (const reason of GIF_REASONS) {
    assert.ok(
      queryForReason(reason).includes('movie'),
      `query for ${reason} is movie-themed`,
    );
  }
});

test('provider builds a Giphy search URL with key and query', () => {
  const provider = new GiphyGifProvider({ apiKey: API_KEY });
  const url = provider.giphyUrl('not-found');
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/v1/gifs/search');
  assert.equal(parsed.searchParams.get('api_key'), API_KEY);
  assert.equal(parsed.searchParams.get('q'), queryForReason('not-found'));
  assert.equal(parsed.searchParams.get('rating'), 'pg-13');
});

test('provider returns the GIF url for a successful fetch, picked from the results', async () => {
  const mock = mockGiphy();
  const provider = new GiphyGifProvider({
    apiKey: API_KEY,
    fetchImpl: mock.fetchImpl,
    random: () => 0.5,
  });
  const url = await provider.random('not-found');
  assert.equal(url, GIPHY_URL);
  assert.equal(mock.calls.length, 1);
});

test('provider returns null on upstream failure without throwing', async () => {
  const mock = mockGiphy(500);
  const provider = new GiphyGifProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const url = await provider.random('not-found');
  assert.equal(url, null);
  assert.equal(mock.calls.length, 1);
});

test('provider returns null without fetching when no API key is configured', async () => {
  const mock = mockGiphy();
  const provider = new GiphyGifProvider({ apiKey: '', fetchImpl: mock.fetchImpl });
  const url = await provider.random('not-found');
  assert.equal(url, null);
  assert.equal(mock.calls.length, 0);
});

test('provider caches one random result per reason for the TTL', async () => {
  const mock = mockGiphy();
  const cache = new TtlCache<{ url: string }>();
  const provider = new GiphyGifProvider({ apiKey: API_KEY, fetchImpl: mock.fetchImpl, cache });
  const first = await provider.random('not-found');
  const second = await provider.random('not-found');
  assert.equal(first, GIPHY_URL);
  assert.equal(second, GIPHY_URL);
  assert.equal(mock.calls.length, 1, 'only the first request reaches Giphy');
});

test('provider caps concurrent upstream calls via the shared semaphore', async () => {
  let active = 0;
  let maxActive = 0;
  const fetchImpl = async (): Promise<Response> => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
    return new Response(giphyBody(GIPHY_URL), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const provider = new GiphyGifProvider({ apiKey: API_KEY, fetchImpl, concurrency: 2 });
  const reasons: GifReason[] = ['not-found', 'empty-or-private', 'rate-limited', 'upstream'];
  await Promise.all(reasons.map((r) => provider.random(r)));
  assert.ok(maxActive <= 2, `expected at most 2 concurrent upstream calls, saw ${maxActive}`);
});

test('GET /api/gif?reason=known returns a Giphy URL without leaking the key', async () => {
  const mock = mockGiphy();
  const app = createApp({ giphyApiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/gif?reason=not-found');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.url, GIPHY_URL);
  const echoed = await app.request('/api/gif?reason=not-found');
  const text = await echoed.text();
  assert.ok(!text.includes(API_KEY), 'the Giphy key never appears in a response');
});

test('GET /api/gif rejects unknown or missing reasons with 400', async () => {
  const mock = mockGiphy();
  const app = createApp({ giphyApiKey: API_KEY, fetchImpl: mock.fetchImpl });
  const bogus = await app.request('/api/gif?reason=bogus');
  assert.equal(bogus.status, 400);
  const missing = await app.request('/api/gif');
  assert.equal(missing.status, 400);
  assert.equal(mock.calls.length, 0);
});

test('GET /api/gif returns 503 when the provider cannot answer', async () => {
  const app = createApp({ giphyApiKey: '', fetchImpl: mockGiphy().fetchImpl });
  const res = await app.request('/api/gif?reason=not-found');
  assert.equal(res.status, 503);
});

test('giphy key read from the environment when not passed in options', async () => {
  originalKey = process.env.GIPHY_API_KEY;
  process.env.GIPHY_API_KEY = API_KEY;
  const mock = mockGiphy();
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/gif?reason=offline');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.url, GIPHY_URL);
});