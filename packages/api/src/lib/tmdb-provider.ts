import type { ArtworkProvider } from './artwork-provider.js';
import { TtlCache } from './cache.js';
import { Semaphore } from './semaphore.js';
import { USER_AGENT } from './letterboxd-client.js';

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const TMDB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_POSTER_SIZE = 'w500';

export interface TMDBArtworkProviderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  semaphore?: Semaphore;
  cache?: TtlCache<{ url: string }>;
  posterSize?: string;
  ttlMs?: number;
  concurrency?: number;
}

interface TMDBSearchResult {
  id: number;
  poster_path: string | null;
}

interface TMDBSearchResponse {
  results: TMDBSearchResult[];
}

export class TMDBArtworkProvider implements ArtworkProvider {
  private readonly semaphore: Semaphore;
  private readonly fetchImpl: typeof fetch;
  private readonly ttlMs: number;
  private readonly posterSize: string;
  private readonly cache: TtlCache<{ url: string }> | undefined;

  constructor(readonly options: TMDBArtworkProviderOptions) {
    this.semaphore = options.semaphore ?? new Semaphore(options.concurrency ?? 4);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.ttlMs = options.ttlMs ?? TMDB_CACHE_TTL_MS;
    this.posterSize = options.posterSize ?? DEFAULT_POSTER_SIZE;
    this.cache = options.cache;
  }

  async fetchArt(title: string, year: string): Promise<string | undefined> {
    if (!this.options.apiKey) return undefined;

    const result = await this.search(title, year);
    if (result) return this.posterUrl(result.poster_path);

    if (year) {
      const titleOnly = await this.search(title, '');
      if (titleOnly) return this.posterUrl(titleOnly.poster_path);
    }

    return undefined;
  }

  private cacheKey(tmdbId: number): string {
    return `tmdb:${tmdbId}`;
  }

  private posterUrl(posterPath: string | null): string | undefined {
    if (!posterPath) return undefined;
    return `${TMDB_IMAGE_BASE}/${this.posterSize}${posterPath}`;
  }

  private async search(title: string, year: string): Promise<TMDBSearchResult | null> {
    const params = new URLSearchParams({ api_key: this.options.apiKey, query: title });
    if (year) params.set('year', year);

    const cacheKey = `tmdb-search:${title}:${year}`;
    const cached = this.cache?.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached.url) as TMDBSearchResult | null;
      return parsed;
    }

    await this.semaphore.acquire();
    try {
      const res = await this.fetchImpl(`${TMDB_SEARCH_URL}?${params.toString()}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as TMDBSearchResponse;
      const first = body.results?.[0];
      if (!first) return null;

      if (first.id && this.cache) {
        this.cache.set(cacheKey, { url: JSON.stringify(first) }, this.ttlMs);
      }

      return first;
    } catch {
      return null;
    } finally {
      this.semaphore.release();
    }
  }
}
