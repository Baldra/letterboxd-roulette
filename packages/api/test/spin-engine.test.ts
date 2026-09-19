import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../src/lib/cache.js';
import { type FetchedPage, LetterboxdClient } from '../src/lib/letterboxd-client.js';
import { SpinEngine } from '../src/lib/spin-engine.js';
import { readFixture } from './helpers.js';
import { resolveQuery } from '../src/lib/url-resolver.js';
import type { ArtworkProvider } from '../src/lib/artwork-provider.js';

function classify(url: string): 'page1' | 'last' | 'intermediate' | 'other' {
  if (url === 'https://letterboxd.com/username/watchlist/') return 'page1';
  if (url === 'https://letterboxd.com/username/watchlist/page/6/') return 'last';
  if (/^https:\/\/letterboxd\.com\/username\/watchlist\/page\/([2-5])\/?$/.test(url)) return 'intermediate';
  return 'other';
}

function mockArtwork(calls: Array<{ title: string; year: string }>): ArtworkProvider {
  return {
    async fetchArt(title: string, year: string) {
      calls.push({ title, year });
      return 'https://example.com/poster.jpg';
    },
  };
}

test('a spin fetches only page 1, the last page, and a single target page', async () => {
  const [page1, last] = await Promise.all([
    readFixture('watchlist-page-1.html'),
    readFixture('watchlist-page-6.html'),
  ]);
  const state: { urls: string[] } = { urls: [] };
  const fetchImpl = async (url: string | URL | Request): Promise<Response> => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    state.urls.push(u);
    if (u === 'https://letterboxd.com/username/watchlist/') return new Response(page1, { status: 200 });
    if (/watchlist\/page\/6\/$/.test(u)) return new Response(last, { status: 200 });
    if (/watchlist\/page\/\d+\/$/.test(u)) return new Response(page1, { status: 200 });
    return new Response('nope', { status: 404 });
  };

  const cache = new TtlCache<FetchedPage>();
  const client = new LetterboxdClient(cache, { fetchImpl });
  const artworkCalls: Array<{ title: string; year: string }> = [];
  const artwork = mockArtwork(artworkCalls);
  const engine = new SpinEngine(client, artwork);
  const resolved = resolveQuery('username')!;

  const spin1Before = state.urls.length;
  const result1 = await engine.spin(resolved);
  const spin1Fetches = state.urls.slice(spin1Before);

  const classified = spin1Fetches.map(classify);
  const unique = [...new Set(classified)];
  assert.ok(unique.includes('page1'), 'page 1 is always fetched first');
  assert.ok(unique.includes('last'), 'the last page is always fetched when P > 1');
  const intermediate = classified.filter((c) => c === 'intermediate').length;
  assert.ok(intermediate <= 1, 'at most one intermediate target page');
  assert.equal(classified.length, classified.length > 2 ? 3 : 2);
  assert.equal(result1.film.slug.length > 0, true);
  assert.match(result1.film.url, /^https:\/\/letterboxd\.com\/film\//);
  assert.equal(result1.list.owner, 'username');
  assert.equal(result1.list.count, 160);

  assert.equal(artworkCalls.length, 0, 'artwork is not fetched by the engine');

  const spin2Before = state.urls.length;
  await engine.spin(resolved);
  const spin2Fetches = state.urls.slice(spin2Before);
  const pages2 = spin2Fetches.map(classify);
  assert.equal(
    pages2.includes('page1'),
    false,
    'page 1 should be reused from cache on the second spin',
  );
  assert.equal(pages2.includes('last'), false, 'last page should be reused from cache');
  assert.ok(pages2.filter((c) => c === 'intermediate').length <= 1);

  assert.equal(artworkCalls.length, 0, 'artwork is still not fetched by the engine');
});
