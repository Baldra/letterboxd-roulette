import { Hono } from 'hono';
import { type TtlCache } from '../lib/cache.js';

export interface ArtworkRouteDeps {
  artworkCache: TtlCache<string>;
}

export function artworkRoute(deps: ArtworkRouteDeps): Hono {
  const router = new Hono();

  router.get('/artwork', (c) => {
    const slug = c.req.query('slug');
    if (!slug) {
      return c.json({ artworkUrl: null }, 200);
    }

    const url = deps.artworkCache.get(slug);
    return c.json({ artworkUrl: url ?? null }, 200);
  });

  return router;
}
