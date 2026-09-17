import { TtlCache } from './cache.js';
import { Semaphore } from './semaphore.js';
import { USER_AGENT } from './letterboxd-client.js';

export const GIF_REASONS = [
  'invalid-input',
  'not-found',
  'empty-or-private',
  'rate-limited',
  'upstream',
  'offline',
] as const;

export type GifReason = (typeof GIF_REASONS)[number];

export const GIF_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';
const SEARCH_LIMIT = 25;

const QUERY_BY_REASON: Record<GifReason, string> = {
  'invalid-input': 'movie wrong answer',
  'not-found': 'movie not found',
  'empty-or-private': 'movie empty',
  'rate-limited': 'movie waiting',
  upstream: 'movie broken',
  offline: 'movie static',
};

export function queryForReason(reason: GifReason): string {
  return QUERY_BY_REASON[reason];
}

export interface GiphyGifProviderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  semaphore?: Semaphore;
  cache?: TtlCache<{ url: string }>;
  ttlMs?: number;
  concurrency?: number;
  limit?: number;
  random?: () => number;
}

/**
 * Thin, bounded client for Giphy's Search endpoint. Shares the same outbound
 * semaphore as the Letterboxd client so total upstream concurrency stays
 * capped, and caches one random result per reason for `ttlMs` so repeated
 * error displays don't hit the provider on every request. Selection is a
 * random pick from the top search hits, keeping the GIF movie-themed and
 * aligned with the error's keyword.
 */
export class GiphyGifProvider {
  private readonly semaphore: Semaphore;
  private readonly fetchImpl: typeof fetch;
  private readonly ttlMs: number;
  private readonly limit: number;
  private readonly randomFn: () => number;

  constructor(readonly options: GiphyGifProviderOptions) {
    this.semaphore = options.semaphore ?? new Semaphore(options.concurrency ?? 4);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.ttlMs = options.ttlMs ?? GIF_CACHE_TTL_MS;
    this.limit = options.limit ?? SEARCH_LIMIT;
    this.randomFn = options.random ?? Math.random;
  }

  giphyUrl(reason: GifReason): string {
    const params = new URLSearchParams({
      api_key: this.options.apiKey,
      q: QUERY_BY_REASON[reason],
      limit: String(this.limit),
      rating: 'pg-13',
    });
    return `${GIPHY_SEARCH_URL}?${params.toString()}`;
  }

  async random(reason: GifReason): Promise<string | null> {
    const key = `gif:${reason}`;
    const cached = this.options.cache?.get(key);
    if (cached) return cached.url;

    const url = await this.fetchRandom(reason);
    if (url !== null) {
      this.options.cache?.set(key, { url }, this.ttlMs);
    }
    return url;
  }

  private async fetchRandom(reason: GifReason): Promise<string | null> {
    if (!this.options.apiKey) return null;
    await this.semaphore.acquire();
    try {
      const res = await this.fetchImpl(this.giphyUrl(reason), {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        data?: Array<{ images?: { fixed_height?: { url?: string } } }>;
      };
      const results = body?.data ?? [];
      if (results.length === 0) return null;
      const index = Math.min(results.length - 1, Math.floor(this.randomFn() * results.length));
      return results[index]?.images?.fixed_height?.url ?? null;
    } catch {
      return null;
    } finally {
      this.semaphore.release();
    }
  }
}