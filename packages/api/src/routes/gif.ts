import { Hono } from 'hono';
import { GIF_REASONS, type GifReason, type GiphyGifProvider } from '../lib/gif-provider.js';

export interface GifRouteDeps {
  provider: GiphyGifProvider;
}

export function gifRoute(deps: GifRouteDeps): Hono {
  const router = new Hono();

  router.get('/gif', async (c) => {
    const reason = c.req.query('reason');
    if (!reason || !GIF_REASONS.includes(reason as GifReason)) {
      return c.json(
        {
          error: `Invalid GIF reason. Supported reasons: ${GIF_REASONS.join(', ')}.`,
        },
        400,
      );
    }

    const url = await deps.provider.random(reason as GifReason);
    if (url === null) {
      return c.json({ error: 'Could not fetch a GIF from the provider right now.' }, 503);
    }
    return c.json({ url });
  });

  return router;
}