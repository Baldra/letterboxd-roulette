## Why

Artwork fetching via TMDB adds latency to every spin response, even though the movie info is available much sooner. Users see a blank screen waiting for a poster that may take hundreds of milliseconds. Returning movie data immediately and letting the client poll for artwork improves perceived performance.

## What Changes

- The spin endpoint returns movie data immediately, with `artworkUrl` omitted initially
- A new endpoint returns the artwork URL for a given spin result (cached by film slug or ID)
- The client polls the artwork endpoint until the poster is ready
- The artwork fetch runs in the background after the spin response is sent

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `spin`: The "Result film data" requirement changes — artwork is no longer awaited before responding; instead it's available via a separate polling endpoint

## Impact

- `packages/api/src/routes/spin.ts` — spin route no longer awaits artwork
- `packages/api/src/lib/spin-engine.ts` — `spin()` returns film data without artwork; artwork is fetched separately
- New route or endpoint for artwork polling
- Frontend (`packages/web`) must be updated to poll for artwork after spin
