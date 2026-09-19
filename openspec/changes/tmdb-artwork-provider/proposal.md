## Why

Artwork is currently scraped from Letterboxd film pages by extracting the `og:image` meta tag. This is fragile — Letterboxd uses Cloudflare protection, HTML structure can change without notice, and artwork fetches share the same rate-limited outbound budget as list page fetches (meaning a throttle event blocks artwork too, and vice versa). The Movie Database (TMDB) offers a stable, versioned API with generous rate limits (~40 req/s) and consistent poster images, making it a more reliable source for film artwork.

## What Changes

- Replace the Letterboxd `og:image` scraping approach with TMDB's `/3/search/movie` API for poster lookup
- Introduce a new `TMDBArtworkProvider` class with its own outbound semaphore and cache, decoupled from the Letterboxd client
- Search by film title + year (from the Letterboxd list entry), with a title-only fallback when the initial search returns no results
- Cache TMDB results by TMDB movie ID (24h TTL) to avoid repeat searches for the same film
- Make poster image size configurable (default `w500`)
- Remove `fetch-film-art.ts` and the `parseOgImage` function from `parse.ts`
- Update the spin spec's artwork requirement to reflect TMDB as the source

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `spin`: Requirement 4 ("Result film data") changes its artwork source from Letterboxd `og:image` scraping to TMDB API search. The scenarios update to reference TMDB instead of "film page exposes an `og:image`". All other requirements remain unchanged.

## Impact

- **Code**: `packages/api/src/lib/` — new `tmdb-provider.ts` and `artwork-provider.ts`; deleted `fetch-film-art.ts`; modified `spin-engine.ts`, `app.ts`, `parse.ts`
- **Tests**: `packages/api/test/` — new `tmdb-provider.test.ts`; deleted `fetch-film-art.test.ts`; modified `spin-engine.test.ts`, `routes.test.ts`
- **Config**: `.env` gains `TMDB_API_KEY` and optional `TMDB_POSTER_SIZE`; `AppOptions` gains `tmdbApiKey` and `tmdbPosterSize`
- **Dependencies**: No new npm packages — uses built-in `fetch`
- **API contract**: No change to the `/api/spin` response shape; `artworkUrl` is still optional and omitted on failure
