## Context

See proposal.md — Why and specs/web-ui/spec.md and specs/gif-proxy/spec.md for the required behavior.

Current state (v1, greenfield-just-archived, with the first restyle pass implemented):
- `App.tsx` holds a four-state machine — `idle` / `pending` / `success` / `error` — with the pending indicator on the brand logo.
- The header renders `components/Brand.tsx` (a clapperboard/reel SVG mark + wordmark) and the error state is a `components/ErrorPanel.tsx` fed by the existing `errorMessages.ts:messageForStatus` (distinct copy per status).
- Reachable error statuses: `400` (invalid input), `404` (not found), `422` (private/empty), `429` (rate limit), `502`/`503` (upstream), and the client-side catch-all (`status 0`, service unreachable).
- The API exposes `GET /api/gif?reason=<key>` backed by `lib/gif-provider.ts`, which maps each reason to a Giphy tag and calls Giphy's Random endpoint (results not movie-specific enough).
- The web package has a `public/gifs/` dir with six fallback GIF assets; `ResultCard` already handles artwork `onError` with a placeholder — a precedent for GIF fallback.

## Goals / Non-Goals

**Goals:**
- A dependency-free frontend for animation and branding (inline SVG/CSS, no GIF libraries); third-party GIF traffic is server-side, cached, and rate-capped.
- The pending indicator is the logo — one animated element instead of a button-label swap.
- Fresh, varied error GIFs per reason (not always the same clip) with a deterministic local fallback, so errors always render even under provider trouble.
- Precise GIF selection: movie-themed GIFs that carry the error's keyword, via the Giphy search API rather than generic tagged-random.
- Terse, friendly error copy: one plain message covers most failures; rate-limiting alone keeps its own line.
- Respect `prefers-reduced-motion` for the spin animation.

**Non-Goals:**
- Changing the spin API, response shape, or `packages/shared` types.
- React Router / new pages; the change stays within the single shell layout.
- Anything server-side beyond the one thin GIF endpoint: no multi-provider aggregation or write-back to Giphy.

## Decisions

### 1. Brand logo: three-circle inline SVG mark + wordmark, not an image asset
An inline SVG mark of three circles in Letterboxd's orange (`#ff8000`), green (`#00e054`), and blue (`#0ea2cc`) arranged as a vertical slot-reel strip, plus a bold white "Letterboxd Roulette" wordmark, drawn in a new `components/Brand.tsx`. Rationale: crisp at any size, no asset to maintain, and the circle colors live in `styles.css` as palette variables alongside the existing design tokens. The three circles deliberately evoke the Letterboxd logo at the user's request, so the wordmark keeps the "Roulette" suffix and the existing "Not affiliated with Letterboxd" footer to avoid a trademark-copy claim.
- *Alternative considered:* bundling a PNG/WebP logo — rejected, needs retina variants and is less flexible than SVG.
- *Alternative considered:* a single clapperboard/reel mark — the first pass's choice, replaced because the user asked explicitly for the three-circle mark.

### 2. Slot-machine spin: CSS keyframes cycling the three-circle strip
The three circles are the reel: a vertical strip whose symbol period equals one circle spacing, so a fixed translate loop (0 → one period) is visually seamless. While `pending`, the reel group translates vertically in an infinite CSS keyframe loop with a linear/eased profile and a slam-to-stop on settle, mirroring a slot reel. The page passes `spinning={pending}` to `Brand`, which toggles a class; keyframes live in `styles.css`. Under `prefers-reduced-motion` the reel renders static. The keyframe loop is frameless — no JS timers, no re-renders while pending.
- *Alternative considered:* JS requestAnimationFrame reel — rejected, CSS is simpler and testable via class presence.
- *Alternative considered:* an external animated GIF as the logo — rejected, scales poorly, and can't honor reduced motion.

### 3. Error GIFs: Giphy search via the API service, local GIF as fallback
The API service owns provider access. New `routes/gif.ts` exposes `GET /api/gif?reason=<key>`; a `gif-provider` module maps each reason key to a movie-keyword query (e.g. `movie not found`, `movie waiting`, `movie empty`) and calls Giphy's Search endpoint (`/v1/gifs/search?q=<query>&limit=25`), picking one random result from the top hits and returning `{ url }` from `data[].images.fixed_height`. Giphy's Random endpoint (tag-based) serves images of any subject and was not precise enough, so Search with an explicit movie keyword yields "a movie GIF with the keyword of the error". The key is read from `GIPHY_API_KEY` (dev env and fly secret), never leaves the server, and never appears in a response.
- **Bounded & cached:** provider calls acquire the same outbound `Semaphore` used by spin requests and reuse the shared `TtlCache` (~24 h per reason). The provider is hit at most daily per reason, so the endpoint stays fast and Giphy's rate limits aren't a concern; a fresh random clip per reason per day is plenty of variety.
- **Client orchestration:** `ErrorPanel` renders the locally bundled `<reason>.gif` immediately (fast, always available), then `lib/errorGifs.ts:randomGifUrl` fetches `/api/gif?reason=<key>` with a short `AbortController` timeout (~1.5 s) and swaps in the remote clip on success. On timeout, HTTP error, or remote image load failure, the local GIF stays; if the local asset is missing too, the image `onError` cascade drops to message-only — reusing the `ResultCard` artwork-fallback pattern. This realizes the requirement exactly: API GIF is the variety source, the local one covers performance.
- *Alternatives considered:* client-side direct Giphy fetch — key leaks into the bundle and outbound traffic is uncapped — rejected. Giphy Random with broad tags — subject not precise enough (not guaranteed movie/keyword) — rejected in favor of Search. Keyless GIF services (e.g. dynamic `tenor.gifs` URLs) — no stable keyword-precise API — rejected. Local-only GIFs — no variety, the user asked for fresh matches — rejected.

### 4. How-to help text placement
One muted line directly under the form label — "Type a username — or `username/list-slug` — then spin to draw one random film from that watchlist or list." It replaces none of the existing copy; it supplements the tagline. Styled with the existing `--lb-muted` token.

### 5. Component/test shape and message simplification
- `App.tsx`: render `<Brand spinning={state.kind === 'pending'} />` in the header; switch the error branch from a single `<p>` to `ErrorPanel`.
- New `components/ErrorPanel.tsx` (reason-matched GIF at 2:3 movie-poster proportions + message, `role="alert"`, theme palette with no red error block, local→remote swap and `onError` cascades), `components/Brand.tsx` (three-circle mark).
- `errorMessages.ts` collapses: `messageForStatus` returns the single unified "Nothing found — the list may be empty, private, or doesn't exist." constant for every status except `429`, which keeps the existing "Too many spins! Wait a moment, then try again." copy. `lib/errorGifs.ts` owns the status→reason classifier, `localGifUrl`, and the timed `randomGifUrl` fetch.
- API: `routes/gif.ts` + `lib/gif-provider.ts`, injected into `createApp` the same way `fetchImpl` is today.
- Tests: `packages/api/test` (gif route + provider caching with mocked fetch), `packages/web/test` (`Brand.test.tsx`, `errorGifs.test.tsx`, `ErrorPanel.test.tsx`, `messageForStatus`), keeping the existing `ResultCard` smoke test green.

## Risks / Trade-offs

- **Fallback GIF assets must be authored at apply time** (binary files, not generatable) → tasks include six GIFs under `public/gifs/`; missing assets degrade to message-only via `onError` rather than breaking.
- **Giphy key missing, expired, or provider rate-limited** → the endpoint only returns `{ url }` on success and otherwise errors cleanly; the client cascade to the local GIF masks provider failure. `GIPHY_API_KEY` is documented as a required production secret and dev env var.
- **Giphy CDN slowness or URL rot** → remote GIFs are hotlinked from Giphy's public CDN (same profile as the `a.ltrbxd.com` artwork today); the 1.5 s timeout plus local-first rendering means the UI never waits on Giphy, and a dead remote URL falls back to the bundled GIF.
- **Trademark proximity of a "Letterboxd-style" logo** → keep the wordmark suffixed with "Roulette" and retain the existing non-affiliation footer; the three-circle mark deliberately evokes the Letterboxd identity at the user's request, which is a stylistic homage rather than a copy.
- **Unified error message hides diagnostics** → by request, users see one plain line and no status detail; the reason key still selects the GIF, and debugging relies on server logs in dev. This is an accepted trade-off, not an accident.
- **Visual direction superseded the unreadable reference** → the initial [Image 1] attachment couldn't be inspected, but the follow-up specified the mark (three circles in the Letterboxd colors), the error presentation (poster-proportioned GIF, no red box), and GIF precision (search API). Exact proportions are still reviewed visually during apply.
- **`prefers-reduced-motion` correctness** → animation is purely additive (a class toggling keyframes); reduced-motion CSS removes the loop, and pending state is still communicated by the disabled button and help copy.

## Migration Plan

Client-plus-one-endpoint change: no data or schema migration. Deploy sets the `GIPHY_API_KEY` secret (fly) and ships normally; dev needs the same key in the local environment for the API-sourced GIFs to resolve. Existing deployments keep the old header/error UI until the new `web/dist` ships. Rollback is a release back to the previous image — no state to repair.

## Open Questions

None — Giphy query wording, circle spacing, and the exact flex/padding values are cosmetic details resolvable during apply without changing the specs, approach, or task breakdown.