import { Hono } from 'hono';
import { TtlCache } from './lib/cache.js';
import { type FetchedPage, LetterboxdClient } from './lib/letterboxd-client.js';
import { SlidingWindowLimiter } from './lib/limiter.js';
import { SpinEngine } from './lib/spin-engine.js';
import { spinRoute } from './routes/spin.js';

export interface AppOptions {
  fetchImpl?: typeof fetch;
  spinRatePerMinute?: number;
  concurrency?: number;
  cacheSize?: number;
}

export const DEFAULT_SPIN_RATE_PER_MINUTE = 30;

export function createApp(options: AppOptions = {}): Hono {
  const cache = new TtlCache<FetchedPage>(options.cacheSize ?? 1000);
  const client = new LetterboxdClient(cache, {
    concurrency: options.concurrency,
    fetchImpl: options.fetchImpl,
  });
  const limiter = new SlidingWindowLimiter(
    options.spinRatePerMinute ?? DEFAULT_SPIN_RATE_PER_MINUTE,
    60_000,
  );
  const engine = new SpinEngine(client);

  const app = new Hono();
  app.route('/api', spinRoute({ engine, limiter }));
  return app;
}

export const app = createApp();