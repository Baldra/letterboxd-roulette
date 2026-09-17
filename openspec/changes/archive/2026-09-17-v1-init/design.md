## Context

Empty repo (OpenSpec scaffold only; no code, no specs). Motivated in proposal.md — Why.

Verified constraints from exploration (during discovery, live against letterboxd.com):
- Public list pages (watchlist, list, etc.) serve full HTML with no Cloudflare challenge. Each film is a `data-component-class="LazyPoster"` div embedding `data-item-name="Title (year)"`, `data-item-slug`, `data-item-link`, and a `film:N` LID.
- Pages hold 28 films; pagination links at `/watchlist/page/N/`; the last page was verified as a partial page (20 films on page 6 of 6 ⇒ 5×28+20 = 160).
- The film metadata endpoint (`/film/<slug>/json/`) IS Cloudflare-challenged — do not use it.
- Individual film HTML pages (`/film/<slug>/`) are not challenged and expose `og:image` gallery artwork on `a.ltrbxd.com`.
- The official Letterboxd API explicitly excludes personal/recommendation projects, so it is not a viable source.

## Goals / Non-Goals

**Goals:**
- A stateless-ish single-container service whose only state is an in-memory page cache and rate counters.
- Uniform random selection at ~1–3 outbound requests per spin regardless of list size.
- A dependency-free-scrape (plain `fetch`, no browser automation, no third-party scrapers).

**Non-Goals:**
- Persistence, accounts, or write-back to Letterboxd (no "remove from watchlist").
- Multi-instance scaling (Redis/cache coherence deferred).
- Streaming or preloading all films; shareable result links; typeahead/search (deferred v2).

## Decisions

### 1. Data source: public HTML scraping, not the API or metadata endpoint
Official API access is barred for this use case; the `json/` metadata endpoint is challenged. Public list and film HTML pages are server-rendered and unchallenged.
- *Alternative considered:* browser automation / headless rendering — too heavy for a hobby site, no need since data is embedded server-side.

### 2. Uniform sampling without fetching the whole list
Two-phase draw over paginated pages:
```
page 1  ->  max page P from pagination tail, list label from <title>,
            detect not-found (404) / private / empty
if P == 1:            N = films on page 1
else:                 page P -> remainder r entries
                      if r == 0:  treat P -= 1, r = 28   (exact multiple of 28)
                      N = 28*(P-1) + r
t = random 1..N;      page = ceil(t/28), slot = ((t-1) mod 28) + 1
fetch that page (from cache if present); return films[slot]
```
Uniform with no bias toward the short last page.
- *Alternative considered:* reservoir sampling across every page (fetches everything); random page + random slot with rejection (expected re-rolls blow up when the last page is nearly empty: r=1 ⇒ ≈28 rolls). Rejected.

### 3. In-memory TTL cache bounds outbound traffic
`Map<url, {payload, fetchedAt}>` keyed by canonical page URL. TTL ~600 s for list pages (watchlists change constantly), ~24 h for film artwork pages (immutable per slug), ~60 s for negative results (404/private) to avoid hammering during a misconfigured client. Expire lazily on access; cap size. Single instance ⇒ no coherence problem.
- *Alternative considered:* Redis/file cache — extra infra for no v1 gain.

### 4. Rate limiting and traffic etiquette
- Inbound: per-IP sliding-window (default ~30 spins/min) → `429`; no outbound fetch on rejected spins.
- Outbound: global concurrency semaphore (default 4) with a short queue; on upstream `403`/`429`/challenge, coalesce for ~30 s and answer `503` with `Retry-After`.
- User-Agent identifies the app and a contact address (spec: Honest client identification).

### 5. Artwork from film page `og:image`
After picking a film, fetch `/film/<slug>/` once, extract `og:image`, serve as `artworkUrl` (uncached miss ⇒ omit field; UI renders a styled placeholder). Avoids the challenged metadata endpoint. *Alternative considered:* decoding Letterboxd's poster-hash from the LID — undocumented and fragile. Rejected.

### 6. API shape
`GET /api/spin?q=<short form>` → `200 { film: {title, year, slug, url, artworkUrl?}, list: {owner, url, count, label} }`. Error mapping:
`400` malformed · `404` user/list not found · `422` private or empty · `429` rate-limited · `503` upstream throttling (`Retry-After`) · `502` unexpected upstream failure. All errors are JSON `{ error: string }`.

### 7. Stack and layout (npm workspaces)
- `packages/shared` — `types.ts` (`Film`, `ListInfo`, `SpinResponse`, `ApiError`), consumed by api and web.
- `packages/api` — Hono on `@hono/node-server`; `routes/spin.ts`; `lib/{url-resolver, letterboxd (fetchListMeta/fetchPage/fetchFilmArt), parse, sampler, cache, limiter, errors}`.
- `packages/web` — Vite + React + TS; `SpinForm`, `ResultCard`; plain CSS for the Letterboxd-inspired theme. Dev: Vite proxies `/api` → Hono (8787). Prod: Hono serves `web/dist` via `@hono/serve-static` with SPA fallback.
- `tsc --strict` + `node:test` (fixtures checked in) on the API; Vitest smoke test for `ResultCard` optional.
- *Alternative considered:* single package with embedded HTML — rejected once React was chosen; using plain `createElement` without Vite adds tooling pain for no benefit.

### 8. Deployment
Single Docker container, multi-stage (`node:22-alpine`): build `shared` + `web`, copy `web/dist` into the API image, run on `PORT` (8080). `fly.toml`: one machine, min/max 1. Railway's Dockerfile support is a drop-in alternative — same image.

## Risks / Trade-offs

- **Letterboxd extends Cloudflare challenges to plain HTML pages** (the `json/` endpoint already is) → cache + outbound caps + honest User-Agent reduce footprint; `503` with a retry message keeps the UX honest; detection: page contains `Just a moment…`/challenge markers.
- **Markup changes break the parser** → parse layer is isolated with checked-in fixture tests; re-capture fixtures during implementation and re-run on archive/spec-signal.
- **Single instance is a single point of failure** → acceptable for hobby scale; Fly restarts keep the (lossless-by-necessity) cache/limits warm only while running; losing them is harmless.
- **Hotlinking `a.ltrbxd.com` images** → these are public-ish CDN assets already served to anonymous browsers; `onerror` placeholder covers revocation.
- **ToS/abuse surface for a public proxy** → inbound per-IP caps + no persistence mean the site is a thin, rate-limited fetcher, not a scraping API; contact inside the User-Agent invites whitelisting.

## Migration Plan

Greenfield: no data or schema to migrate. Steps: `fly launch` from the Dockerfile, wire `PORT=8080` 🡒 verify a spin against the public `username` watchlist as a smoke test. Rollback: `fly releases` to the previous image; no state to repair.

## Open Questions

None — the deferred items (shareable links, typeahead, exclude-watched, multi-instance) are deliberate non-goals for v1 and do not change the specs or task breakdown if pursued later.