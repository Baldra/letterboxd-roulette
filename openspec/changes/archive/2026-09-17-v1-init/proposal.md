## Why

Choosing "what to watch tonight" from a Letterboxd watchlist is manual friction, and the official Letterboxd API explicitly excludes personal and recommendation use cases, so it is not accessible for this product. However, public Letterboxd pages embed every film's data server-side (title, slug, link, LID) with no challenge, which makes a lightweight hosted "spin" service viable with zero auth.

## What Changes

Greenfield v1: a hosted, single-page site that returns one random film from a user's Letterboxd watchlist or any public list.

- Input via short forms (no full URLs): `username` resolves to the watchlist; `username/list-slug` resolves to a public list at `/username/list/list-slug/`.
- Server (Node 22 + Hono, npm workspaces): `GET /api/spin?q=<short form>` returns the random film and the list it came from.
- Uniform random sampling that never fetches the whole list: read total pages from page 1, remainder from the last page, then one weighted page fetch. ~3 uncached outbound requests per spin; ~1 when pages are cached.
- Persistence-free: in-memory TTL page cache (default 10 min) + per-IP inbound rate limiting + outbound concurrency cap with an honest User-Agent. Single-instance deployment keeps in-memory state coherent.
- Gallery art for results comes from the film page's `og:image` (the film `json/` metadata endpoint is Cloudflare-challenged and is deliberately not used), with graceful placeholder fallback.
- Frontend (React + Vite, TypeScript), styled after Letterboxd's aesthetic (dark `#14181c` background, white titles, muted gray-blue body, green accent): input + spin button, result card with artwork, title (year), list label + size, "Open on Letterboxd", "Spin again".
- Error taxonomy maps to HTTP: 400 malformed input, 404 user/list not found, 422 private or empty list, 503 upstream throttling, 502 upstream unreachable.

## Capabilities

### New Capabilities
- `spin`: Server-side random film selection from Letterboxd watchlists and public lists — input resolution, uniform sampling, scraping, caching, rate limiting, and API error contract.
- `web-ui`: The Letterboxd-styled React frontend — input form, result presentation, and navigation behavior.

### Modified Capabilities
- None (fresh repo, no existing specs).

## Impact

- Greenfield codebase: npm workspaces monorepo with `packages/shared` (types), `packages/api` (Hono), `packages/web` (React/Vite).
- Deployment: Dockerfile + `fly.toml`, single container; the web build is copied into the API image and served by Hono; Vite proxies `/api` in dev.
- External dependency: outbound HTML scraping of `letterboxd.com` (public pages). Documented risk: Letterboxd could extend Cloudflare challenges to plain pages; mitigated by caching, outbound caps, honest User-Agent, and a graceful 503 with retry messaging.
- Testing: `tsc --strict`; `node:test` for parser/sampler/url-resolver/error mapping against checked-in fixtures.