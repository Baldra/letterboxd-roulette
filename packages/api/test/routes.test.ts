import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { readFixture } from './helpers.js';

const PRIVATE_HTML =
  '<html><head><title>Private &bull; Letterboxd</title></head><body></body></html>';
const EMPTY_HTML =
  '<html><head><title>username’s Watchlist &bull; Letterboxd</title></head><body><p>no films</p></body></html>';

interface Mock {
  calls: string[];
  fetchImpl: typeof fetch;
}

function mockFetch(htmlByUrl: (u: string) => { status: number; html: string } | Promise<{ status: number; html: string }>): Mock {
  const calls: string[] = [];
  const fetchImpl = async (url: string | URL | Request): Promise<Response> => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    calls.push(u);
    const res = await htmlByUrl(u);
    return new Response(res.html, { status: res.status });
  };
  return { calls, fetchImpl };
}

function watchlistMocks(): Mock {
  return mockFetch(async (u) => {
    if (u === 'https://letterboxd.com/username/watchlist/') {
      return { status: 200, html: await readFixture('watchlist-page-1.html') };
    }
    if (/\/watchlist\/page\/6\/$/.test(u)) {
      return { status: 200, html: await readFixture('watchlist-page-6.html') };
    }
    if (/\/watchlist\/page\/\d+\/$/.test(u)) {
      return { status: 200, html: await readFixture('watchlist-page-1.html') };
    }
    if (/\/film\//.test(u)) {
      return { status: 200, html: await readFixture('film-the-captive.html') };
    }
    return { status: 404, html: '<title>Letterboxd - Not Found</title>' };
  });
}

test('successful spin returns the SpinResponse shape', async () => {
  const mock = watchlistMocks();
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=username');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.film);
  assert.equal(typeof body.film.title, 'string');
  assert.equal(typeof body.film.year, 'string');
  assert.ok(body.film.url.startsWith('https://letterboxd.com/film/'));
  assert.ok(typeof body.film.artworkUrl === 'string');
  assert.ok(body.list);
  assert.equal(body.list.owner, 'username');
  assert.equal(body.list.count, 160);
  assert.match(body.list.label, /Watchlist/i);
});

test('malformed query returns 400 without any upstream fetch', async () => {
  const mock = watchlistMocks();
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=https%3A%2F%2Fletterboxd.com%2Fusername%2Fwatchlist%2F');
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error.includes('Malformed'));
  assert.equal(mock.calls.length, 0);
});

test('nonexistent user returns 404 with a user-level message', async () => {
  const mock = mockFetch(() => ({
    status: 404,
    html: '<title>Letterboxd - Not Found</title>',
  }));
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=no-such-user');
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'User not found');
});

test('nonexistent list returns 404 distinguishing it from the user', async () => {
  const mock = mockFetch(() => ({
    status: 404,
    html: '<title>Letterboxd - Not Found</title>',
  }));
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=username/this-list-does-not-exist');
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'List not found');
});

test('private list returns 422', async () => {
  const mock = mockFetch(() => ({ status: 200, html: PRIVATE_HTML }));
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=someone/private-list');
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.match(body.error, /private/i);
});

test('empty list returns 422', async () => {
  const mock = mockFetch(() => ({ status: 200, html: EMPTY_HTML }));
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=someone');
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.match(body.error, /empty/i);
});

test('upstream throttling returns 503 with Retry-After', async () => {
  const mock = mockFetch(() => ({ status: 403, html: '<html>challenge</html>' }));
  const app = createApp({ fetchImpl: mock.fetchImpl });
  const res = await app.request('/api/spin?q=username');
  assert.equal(res.status, 503);
  assert.ok(res.headers.get('Retry-After'));
  const body = await res.json();
  assert.match(body.error, /rate-limiting/i);
});

test('per-IP rate limit returns 429 and makes no outbound fetch', async () => {
  const mock = watchlistMocks();
  const app = createApp({ fetchImpl: mock.fetchImpl, spinRatePerMinute: 2 });
  const first = await app.request('/api/spin?q=username');
  assert.equal(first.status, 200);
  const second = await app.request('/api/spin?q=username');
  assert.equal(second.status, 200);
  const callsBefore = mock.calls.length;
  const third = await app.request('/api/spin?q=username');
  assert.equal(third.status, 429);
  const body = await third.json();
  assert.match(body.error, /Rate limit/i);
  assert.equal(mock.calls.length, callsBefore, 'no upstream fetch on a 429');
});