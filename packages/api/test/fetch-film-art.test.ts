import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../src/lib/cache.js';
import { fetchFilmArt } from '../src/lib/fetch-film-art.js';
import { type FetchedPage, LetterboxdClient } from '../src/lib/letterboxd-client.js';
import { readFixture } from './helpers.js';

test('returns artwork from a film page og:image', async () => {
  const html = await readFixture('film-the-captive.html');
  const fetchImpl = async () => new Response(html, { status: 200 });
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  const art = await fetchFilmArt(client, 'the-captive');
  assert.ok(art?.startsWith('https://a.ltrbxd.com/'));
});

test('omits artwork when the page has no og:image', async () => {
  const fetchImpl = async () => new Response('<html><body></body></html>', { status: 200 });
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  assert.equal(await fetchFilmArt(client, 'some-film'), undefined);
});

test('omits artwork when the fetch fails instead of throwing', async () => {
  const fetchImpl = async () => {
    throw new Error('network down');
  };
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  assert.equal(await fetchFilmArt(client, 'some-film'), undefined);
});

test('omits artwork on a not-found film page', async () => {
  const fetchImpl = async () => new Response('<title>Letterboxd - Not Found</title>', { status: 404 });
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  assert.equal(await fetchFilmArt(client, 'nope'), undefined);
});