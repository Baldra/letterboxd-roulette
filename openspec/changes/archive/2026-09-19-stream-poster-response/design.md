## Context

`SpinEngine.spin()` currently awaits artwork before returning. The artwork fetch (TMDB search + image URL) adds 100-300ms of latency to every spin. Movie data (title, year, slug, URL) is available much sooner. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Return movie data from `/api/spin` without waiting for artwork
- Provide a separate endpoint to poll for artwork status
- Background-fetch artwork after spin response is sent

**Non-Goals:**
- Real-time push (WebSocket/SSE) — out of scope for this iteration
- Changing the TMDB provider itself
- Caching artwork across different films (only cache per-spin result)

## Decisions

### 1. Two-phase response with polling

**Decision:** Split into `/api/spin` (returns film immediately) and `/api/artwork?slug=<slug>` (returns artwork when ready).

**Alternatives considered:**
- **SSE stream**: More complex, harder to cache, overkill for a single update
- **Background + callback**: Requires client to expose an endpoint, complicates CORS

**Rationale:** Polling is simple, stateless, and works with any HTTP client. The artwork fetch completes in <1s typically, so 1-2 polls suffice.

### 2. Artwork cache keyed by film slug

**Decision:** Store artwork results in a `TtlCache<string>` keyed by film slug. The spin route populates it; the artwork route reads it.

**Rationale:** The slug is already unique per film and available in both the spin response and the artwork request. No need for a separate ID scheme.

### 3. Background fetch via `queueMicrotask`

**Decision:** After sending the spin response, fire off the artwork fetch using `queueMicrotask` or a simple `void promise` so it doesn't block the response.

**Alternatives considered:**
- **setImmediate/setTimeout**: Slightly more overhead, no benefit over microtask for this use case
- **Worker thread**: Overkill for a single HTTP call

**Rationale:** The fetch is already bounded by the semaphore. Fire-and-forget with the result going to the cache is sufficient.

## Risks / Trade-offs

- **[Client polling overhead]** → Minimal: artwork endpoint is fast (cache hit), and clients poll at most 2-3 times
- **[Race condition: artwork requested before fetch completes]** → The cache returns a pending/null state; client retries after a short delay
- **[Memory: artwork cache grows]** → Mitigated by TTL eviction (reuse existing `TtlCache` with 60s TTL)
