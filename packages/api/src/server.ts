import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Context } from 'hono';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);

// `server.js` is compiled to `packages/api/dist/src/`, so the web build is
// `../../../web/dist` from there. When run un-compiled (dev) the extra
// `../` level is also correct, so pick the first that exists.
const candidates = [
  fileURLToPath(new URL('../../../web/dist', import.meta.url)),
  fileURLToPath(new URL('../../web/dist', import.meta.url)),
];
let webDist = '';
for (const c of candidates) {
  try {
    await access(c);
    webDist = c;
    break;
  } catch {
    // keep looking
  }
}

const indexHtml = `${webDist}/index.html`;

const app = createApp();

async function returnIndex(_path: string, c: Context): Promise<void> {
  if (c.req.path.startsWith('/api')) {
    c.status(404);
    c.header('Content-Type', 'application/json');
    c.body('{"error":"Not found"}');
    return;
  }
  if (!webDist) {
    c.status(503);
    c.body('Frontend not built yet. Run `npm run build -w @lr/web` first.');
    return;
  }
  c.res = new Response(await readFile(indexHtml, 'utf8'), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

app.get('*', serveStatic({ root: webDist, index: 'index.html', onNotFound: returnIndex }));

serve({ fetch: app.fetch, port });
console.log(`letterboxd-roulette listening on http://localhost:${port}`);