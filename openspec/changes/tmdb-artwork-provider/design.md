## Context

Artwork is currently fetched by scraping each film's Letterboxd page for the `og:image` meta tag. This runs through the same `LetterboxdClient` as list page fetches — sharing the semaphore (max 4), cache, and throttle state. A throttle event from list scraping blocks artwork fetches and vice versa. Letterboxd also uses Cloudflare protection that occasionally serves challenge pages, making the scrape fragile.

TMDB provides a free, versioned REST API (`/3/search/movie`) with ~40 req/s rate limits, returning structured JSON with `poster_path` fields. Image URLs are constructed from a stable base (`https://image.tmdb.org/t/p/{size}{path}`).

## Goals / Non-Goals

**Goals:**
- Replace Letterboxd og:image scraping with TMDB API for poster lookup
- Decouple artwork fetches from Letterboxd's outbound budget (separate semaphore)
- Cache by TMDB movie ID to avoid repeat searches for the same film
- Make poster size configurable (default `w500`)
- Graceful degradation: missing key, no results, or network failure yields no artwork (not an error)

**Non-Goals:**
- Changing the `/api/spin` response shape or error semantics
- Adding TMDB data beyond poster images (genres, ratings, etc.)
- Migrating other Letterboxd scraping (list pages, pagination) to TMDB
- Server-side image proxying or resizing

## Decisions

### 1. Separate semaphore for TMDB traffic

**Decision**: Create a dedicated `Semaphore` for TMDB calls, shared only among TMDB requests.

**Alternatives considered**:
- *Share the existing Letterboxd semaphore*: Simpler, but TMDB calls would queue behind Letterboxd fetches (and vice versa). Since TMDB is fast and reliable, this creates unnecessary coupling.
- *No semaphore for TMDB*: TMDB's ~40 req/s limit is generous, but unbounded concurrency could still cause issues under load.

**Rationale**: Isolation prevents a TMDB slowdown from blocking Letterboxd list fetches and keeps the global outbound budget predictable.

### 2. Cache key: TMDB movie ID

**Decision**: Cache poster URLs keyed by `tmdb:{tmdbId}` with 24h TTL.

**Alternatives considered**:
- *Cache by title+year*: Avoids the initial search, but could miss re-releases or alternate titles.
- *Cache by Letterboxd slug*: Same key semantics as today, but ties cache to Letterboxd identity rather than the artwork source.

**Rationale**: TMDB movie ID is the stable, canonical identifier. One search per film, then all subsequent spins for that film hit cache.

### 3. Search strategy: title+year, fallback to title

**Decision**: Search `query=title&year=year` first. On zero results, retry with `query=title` only. Return `undefined` if both fail.

**Alternatives considered**:
- *Title+year only*: Simpler, but misses films where Letterboxd's year differs from TMDB's (e.g., festival premiere vs. wide release year).
- *Title only always*: Less precise, could return wrong film for common titles.

**Rationale**: Two-step search is one extra HTTP call only on misses, with much better coverage for year mismatches.

### 4. `ArtworkProvider` interface

**Decision**: Define a thin `ArtworkProvider` interface that `SpinEngine` depends on, with `TMDBArtworkProvider` as the concrete implementation.

**Alternatives considered**:
- *Direct TMDB import in SpinEngine*: Simpler, but couples the engine to a specific provider.
- *No interface, just pass a function*: Slightly less ceremony, but loses the ability to swap implementations cleanly.

**Rationale**: Interface keeps SpinEngine testable and provider-agnostic. Follows the existing pattern where `GiphyGifProvider` is a standalone class injected into the route.

### 5. Configuration via env + constructor options

**Decision**: `TMDB_API_KEY` and `TMDB_POSTER_SIZE` env vars, overridable via `AppOptions`.

**Alternatives considered**:
- *Constructor-only*: No env support — harder to deploy.
- *Env-only*: No programmatic override — harder to test.

**Rationale**: Matches the existing `GIPHY_API_KEY` pattern in the codebase.

### 6. Remove `parseOgImage` from `parse.ts`

**Decision**: Delete `OG_IMAGE_RE` and `parseOgImage()` since nothing will use them after the TMDB migration.

**Alternatives considered**:
- *Keep for potential future use*: Dead code; can be restored from git if needed.

**Rationale**: Clean removal. The regex and function are only used by `fetch-film-art.ts`.

## Risks / Trade-offs

- **TMDB search mismatch** → Title+year search may return the wrong film for very common titles or remakes. Mitigated by the fact that Letterboxd slugs are specific, and poster art is best-effort (omitted on mismatch, not fatal).
- **TMDB API key management** → New secret to rotate. Mitigated by matching the existing `GIPHY_API_KEY` pattern.
- **No fallback to Letterboxd** → If TMDB is down, artwork is omitted. Acceptable because artwork is decorative and the current Letterboxd scrape is also best-effort.
- **Test coverage gap** → The existing `routes.test.ts` asserts `artworkUrl` is a string. With TMDB mocked to return no results, this assertion needs updating to check for `string | undefined`.
