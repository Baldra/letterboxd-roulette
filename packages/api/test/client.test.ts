import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from '../src/lib/cache.js';
import { HttpError } from '../src/lib/errors.js';
import { type FetchedPage, LetterboxdClient, USER_AGENT } from '../src/lib/letterboxd-client.js';

interface CallRecord {
  url: string;
  headers: Record<string, string>;
}

function recordingFetch(handler: (call: CallRecord) => Response | Promise<Response>) {
  const calls: CallRecord[] = [];
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url: u, headers });
    return handler(calls[calls.length - 1]!);
  };
  return { calls, fetchImpl };
}

test('sends the honest User-Agent on outbound requests', async () => {
  const { calls, fetchImpl } = recordingFetch(
    () => new Response('<html><body>ok</body></html>', { status: 200 }),
  );
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  await client.fetchPage('https://letterboxd.com/x/watchlist/');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.headers['User-Agent'], USER_AGENT);
});

test('caches positive responses and serves repeats from cache', async () => {
  const { calls, fetchImpl } = recordingFetch(
    () => new Response('<html><body>ok</body></html>', { status: 200 }),
  );
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  const first = await client.fetchPage('https://letterboxd.com/x/watchlist/', 60_000, 60_000);
  const second = await client.fetchPage('https://letterboxd.com/x/watchlist/', 60_000, 60_000);
  assert.equal(calls.length, 1);
  assert.equal(first.fromCache, false);
  assert.equal(second.fromCache, true);
});

test('retries a 5xx before succeeding', async () => {
  let calls = 0;
  const fetchImpl = async (): Promise<Response> => {
    calls += 1;
    if (calls === 1) return new Response('boom', { status: 500 });
    return new Response('<html><body>ok</body></html>', { status: 200 });
  };
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl, retryDelayMs: 1 });
  const page = await client.fetchPage('https://letterboxd.com/x/watchlist/');
  assert.equal(calls, 2);
  assert.equal(page.status, 200);
});

test('maps an upstream 503 to the 503 path with Retry-After', async () => {
  const fetchImpl = async (): Promise<Response> =>
    new Response('throttled', { status: 503, headers: { 'Retry-After': '5' } });
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl, retryDelayMs: 1 });
  await assert.rejects(
    () => client.fetchPage('https://letterboxd.com/x/watchlist/'),
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 503);
      assert.equal(err.retryAfterSeconds, 5);
      return true;
    },
  );
});

test('upstream 403 coalesces into a 503 and suppresses further fetches', async () => {
  const { calls, fetchImpl } = recordingFetch(
    () => new Response('challenge', { status: 403 }),
  );
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), {
    fetchImpl,
    throttleCooldownMs: 5_000,
    retryDelayMs: 1,
  });
  await assert.rejects(() => client.fetchPage('https://letterboxd.com/x/watchlist/'), HttpError);
  await assert.rejects(
    () => client.fetchPage('https://letterboxd.com/x/watchlist/'),
    (err: unknown) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 503);
      assert.ok((err.retryAfterSeconds ?? 0) > 0);
      return true;
    },
  );
  assert.equal(calls.length, 1, 'no outbound fetch should happen while throttled');
});

test('caches 404 negative results for a short TTL', async () => {
  const { calls, fetchImpl } = recordingFetch(
    () => new Response('<title>Letterboxd - Not Found</title>', { status: 404 }),
  );
  const client = new LetterboxdClient(new TtlCache<FetchedPage>(), { fetchImpl });
  await client.fetchPage('https://letterboxd.com/nope/watchlist/', 600_000, 60_000);
  const second = await client.fetchPage('https://letterboxd.com/nope/watchlist/', 600_000, 60_000);
  assert.equal(calls.length, 1);
  assert.equal(second.status, 404);
  assert.equal(second.fromCache, true);
});