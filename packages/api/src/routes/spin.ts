import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { type ArtworkProvider } from '../lib/artwork-provider.js';
import { type TtlCache } from '../lib/cache.js';
import { HttpError } from '../lib/errors.js';
import { type SlidingWindowLimiter } from '../lib/limiter.js';
import { type SpinEngine } from '../lib/spin-engine.js';
import { resolveQuery } from '../lib/url-resolver.js';

export interface SpinRouteDeps {
  engine: SpinEngine;
  limiter: SlidingWindowLimiter;
  artwork: ArtworkProvider;
  artworkCache: TtlCache<string>;
}

function clientIp(c: Context): string {
  try {
    const info = getConnInfo(c);
    if (info?.remote?.address) return info.remote.address;
  } catch {
    // not running under @hono/node-server (tests / dev proxy)
  }
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function spinRoute(deps: SpinRouteDeps): Hono {
  const router = new Hono();

  router.get('/spin', async (c) => {
    const q = c.req.query('q') ?? '';
    const resolved = resolveQuery(q);
    if (!resolved) {
      return c.json(
        { error: 'Malformed query. Expected `username` or `username/list-slug`.' },
        400,
      );
    }

    const ip = clientIp(c);
    if (!deps.limiter.allow(ip)) {
      return c.json({ error: 'Rate limit exceeded. Slow down and try again.' }, 429, {
        'Retry-After': '2',
      });
    }

    try {
      const result = await deps.engine.spin(resolved);
      const response = c.json(result, 200);

      // Fire-and-forget: fetch artwork in background, write to cache
      const { film } = result;
      deps.artwork.fetchArt(film.title, film.year).then((url) => {
        if (url) deps.artworkCache.set(film.slug, url, 60_000);
      }).catch(() => {});

      return response;
    } catch (err) {
      if (err instanceof HttpError) {
        const headers: Record<string, string> = {};
        if (err.retryAfterSeconds !== undefined) {
          headers['Retry-After'] = String(err.retryAfterSeconds);
        }
        return c.json({ error: err.message }, err.status as ContentfulStatusCode, headers);
      }
      console.error('spin failed unexpectedly', err);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  return router;
}