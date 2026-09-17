import { TtlCache } from './cache.js';
import { serviceUnavailable, type HttpError } from './errors.js';
import { CHALLENGE_PATTERNS } from './list-meta.js';
import { Semaphore } from './semaphore.js';

export const USER_AGENT =
  'letterboxd-roulette/0.1 (+https://github.com/letterboxd-roulette/letterboxd-roulette; contact: dev@example.org)';

export interface FetchedPage {
  status: number;
  html: string;
  fromCache: boolean;
}

export interface LetterboxdClientOptions {
  concurrency?: number;
  throttleCooldownMs?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  semaphore?: Semaphore;
}

export const NO_CACHE = -1;

/**
 * Outbound HTTP pipeline to letterboxd.com: global concurrency cap, honest
 * User-Agent, retry/backoff on upstream throttling, and a coalesced 503 path
 * (via the `throttled` error) so a burst of 403/429 responses doesn't fan out.
 */
export class LetterboxdClient {
  private readonly semaphore: Semaphore;
  private readonly fetchImpl: typeof fetch;
  private readonly throttleCooldownMs: number;
  private readonly retryDelayMs: number;
  private throttleUntil = 0;

  constructor(
    private readonly cache: TtlCache<FetchedPage>,
    options: LetterboxdClientOptions = {},
  ) {
    this.semaphore = options.semaphore ?? new Semaphore(options.concurrency ?? 4);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.throttleCooldownMs = options.throttleCooldownMs ?? 30_000;
    this.retryDelayMs = options.retryDelayMs ?? 300;
  }

  isThrottled(): boolean {
    return Date.now() < this.throttleUntil;
  }

  remainingCooldownMs(): number {
    return Math.max(0, this.throttleUntil - Date.now());
  }

  /**
   * Fetch a page, honouring the cache and the throttle state.
   * `ttlMs: NO_CACHE` skips caching entirely. 404s are cached as negative
   * results with `negativeTtlMs` to avoid hammering a misconfigured client.
   */
  async fetchPage(
    url: string,
    ttlMs = 600_000,
    negativeTtlMs = 60_000,
  ): Promise<FetchedPage> {
    if (ttlMs !== NO_CACHE) {
      const cached = this.cache.get(url);
      if (cached) return { ...cached, fromCache: true };
    }
    if (this.isThrottled()) {
      throw serviceUnavailable(
        'Letterboxd is rate-limiting requests; try again shortly',
        Math.ceil(this.remainingCooldownMs() / 1000),
      );
    }

    await this.semaphore.acquire();
    try {
      const page = await this.fetchWithRetry(url);
      if (ttlMs !== NO_CACHE) {
        this.cache.set(url, page, page.status === 404 ? negativeTtlMs : ttlMs);
      }
      return page;
    } finally {
      this.semaphore.release();
    }
  }

  private async fetchWithRetry(url: string): Promise<FetchedPage> {
    let attempt = 0;
    for (;;) {
      const res = await this.fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      const text = await res.text();
      const challenged = CHALLENGE_PATTERNS.some((re) => re.test(text));

      if (retryAfter(res) !== null) {
        await this.enterThrottle(Number(retryAfter(res)));
        throw this.throttledError();
      }
      if (res.status === 429 || res.status === 403 || challenged) {
        await this.enterThrottle();
        throw this.throttledError();
      }
      if (res.status >= 500 && attempt < 2) {
        attempt += 1;
        await sleep(this.retryDelayMs * attempt);
        continue;
      }

      return { status: res.status, html: text, fromCache: false };
    }
  }

  private async enterThrottle(delaySeconds?: number): Promise<void> {
    const cooldown = delaySeconds ? delaySeconds * 1000 : this.throttleCooldownMs;
    this.throttleUntil = Math.max(this.throttleUntil, Date.now() + cooldown);
    await sleep(0);
  }

  private throttledError(): HttpError {
    return serviceUnavailable(
      'Letterboxd is rate-limiting requests; try again shortly',
      Math.ceil(this.remainingCooldownMs() / 1000),
    );
  }
}

function retryAfter(res: Response): string | null {
  return res.headers.get('Retry-After');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}