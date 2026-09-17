## Why

The v1 UI is functional but austere: a plain text title, no brand, and every failure renders as a single red text line. The page should feel like a finished product — a Letterboxd-style brand logo (a three-circle mark in Letterboxd's orange, green, and blue) that visibly spins like a slot machine while a spin is in flight, a short line explaining how to use it, and a movie-themed GIF on every failure so errors read as intentional flavor rather than a broken app. Error copy stays deliberately terse: except for rate-limiting, every failure shows one plain message, and no status or server detail is surfaced to the user.

## What Changes

- Replace the plain text `<h1>` header with a Letterboxd-style brand logo: a mark of three circles in Letterboxd's orange (`#ff8000`), green (`#00e054`), and blue (`#0ea2cc`), like the Letterboxd logo, plus a "Letterboxd Roulette" wordmark.
- While a spin is pending, the logo runs a slot-machine reel spin animation; the animation stops when the request settles. The submit button remains disabled as today.
- Add a short how-to line near the form describing the accepted input format (`username` or `username/list-slug`) and what a spin does.
- Add `GET /api/gif?reason=<key>` to the spin service: a thin proxy that selects a random movie-themed GIF matching the error's keyword from the Giphy search API, capped and cached.
- Failures are simplified. Except for rate-limiting, every failure shows the same short plain-language message — "Nothing found — the list may be empty, private, or doesn't exist." — instead of status-specific detail; the rate-limit failure keeps its own "too many spins" line. No other status or server detail is surfaced.
- Each failure also shows a movie-themed GIF matched to the error reason (invalid input, not found, private/empty, rate-limited, upstream unavailability, offline), sized like a movie poster (2:3) and presented with the message in the theme palette — no red error box. The page asks the new GIF endpoint for a fresh random clip per reason — so consecutive failures aren't always the same GIF — and falls back to a locally bundled GIF when the API is slow or unavailable.
- Keep the existing Letterboxd palette; extend the stylesheet for the new header, spin animation, help text, and GIF-backed error block.

## Capabilities

### New Capabilities

- `gif-proxy`: server-side selection of a random movie-themed GIF matched to the error keyword via the Giphy search API, served as a capped, cached endpoint under the existing API service.

### Modified Capabilities

- `web-ui`: brand logo header (three-circle mark), slot-machine spin while pending, how-to help text, simplified single-message error copy (rate-limit excepted), and GIF-backed error presentation (API-sourced with a local fallback) are spec-level behavior changes to the existing web-ui capability.

## Impact

- `packages/api`: new `routes/gif.ts` and a Giphy provider module (reason-to-search-query mapping against the search endpoint, TTL caching, existing outbound semaphore), `GIPHY_API_KEY` env var (set as a production secret, also available in dev), and route tests.
- `packages/web/src`: `App.tsx` (header, error rendering), new brand/logo component, error-reason classification plus GIF fetch/fallback logic, single-constant error message (`messageForStatus` keeps only the 429 branch distinct), `styles.css`, `index.html` (title/metadata).
- New fallback GIF assets under `packages/web/public/gifs/` (first use of a `public/` dir in the web package).
- Tests in `packages/api/test` and `packages/web/test` for the GIF endpoint, pending spin state, message split, and GIF mapping/fallback.
- No changes to `packages/shared` or the spin semantics. One server-side runtime dependency (Giphy REST) with a bundled-GIF fallback; no client-side dependencies.