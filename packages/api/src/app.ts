import { Hono } from 'hono';
import { TtlCache } from './lib/cache.js';
import { GiphyGifProvider } from './lib/gif-provider.js';
import { type FetchedPage, LetterboxdClient } from './lib/letterboxd-client.js';
import { SlidingWindowLimiter } from './lib/limiter.js';
import { Semaphore } from './lib/semaphore.js';
import { SpinEngine } from './lib/spin-engine.js';
import { gifRoute } from './routes/gif.js';
import { spinRoute } from './routes/spin.js';

export interface AppOptions {
  fetchImpl?: typeof fetch;
  spinRatePerMinute?: number;
  concurrency?: number;
  cacheSize?: number;
  giphyApiKey?: string;
}

export const DEFAULT_SPIN_RATE_PER_MINUTE = 30;
export const DEFAULT_OUTBOUND_CONCURRENCY = 4;

export function createApp(options: AppOptions = {}): Hono {
  const cache = new TtlCache<FetchedPage>(options.cacheSize ?? 1000);
  const semaphore = new Semaphore(options.concurrency ?? DEFAULT_OUTBOUND_CONCURRENCY);
  const client = new LetterboxdClient(cache, {
    concurrency: options.concurrency,
    fetchImpl: options.fetchImpl,
    semaphore,
  });
  const limiter = new SlidingWindowLimiter(
    options.spinRatePerMinute ?? DEFAULT_SPIN_RATE_PER_MINUTE,
    60_000,
  );
  const engine = new SpinEngine(client);
  const gifProvider = new GiphyGifProvider({
    apiKey: options.giphyApiKey ?? process.env.GIPHY_API_KEY ?? '',
    fetchImpl: options.fetchImpl,
    semaphore,
    cache: new TtlCache<{ url: string }>(64),
  });

  const app = new Hono();
  app.route('/api', spinRoute({ engine, limiter }));
  app.route('/api', gifRoute({ provider: gifProvider }));
  return app;
}

export const app = createApp();