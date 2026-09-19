## 1. Artwork provider interface

- [x] 1.1 Create `packages/api/src/lib/artwork-provider.ts` with `ArtworkProvider` interface (`fetchArt(title, year): Promise<string | undefined>`) and verify it compiles with `npm run typecheck -w @lr/api`

## 2. TMDB artwork provider

- [x] 2.1 Create `packages/api/src/lib/tmdb-provider.ts` implementing `TMDBArtworkProvider` with TMDB search, title-only fallback, semaphore, cache keyed by `tmdb:{id}`, configurable poster size, and graceful degradation; verify with `npm run typecheck -w @lr/api`
- [x] 2.2 Create `packages/api/test/tmdb-provider.test.ts` covering: successful search returns poster URL, cache hit on second call, missing API key returns `undefined`, no results returns `undefined`, network error returns `undefined`, configurable poster size; verify with `npm run test -w @lr/api`

## 3. Wire into SpinEngine

- [x] 3.1 Update `packages/api/src/lib/spin-engine.ts`: accept `ArtworkProvider` in constructor, replace `fetchFilmArt(this.client, entry.slug)` with `this.artwork.fetchArt(entry.title, entry.year)`, remove `fetch-film-art` import; verify with `npm run typecheck -w @lr/api`
- [ ] 3.2 Update `packages/api/test/spin-engine.test.ts`: inject mock `ArtworkProvider` into `SpinEngine` constructor, remove film page fixture from fetch mock, verify `fetchArt` called with `(title, year)`; verify with `npm run test -w @lr/api`

## 4. Wire into app.ts

- [x] 4.1 Update `packages/api/src/app.ts`: import `TMDBArtworkProvider` and `ArtworkProvider`, add `tmdbApiKey`/`tmdbPosterSize` to `AppOptions`, create dedicated TMDB semaphore and cache, instantiate `TMDBArtworkProvider`, pass to `SpinEngine`; verify with `npm run typecheck -w @lr/api`

## 5. Remove old artwork code

- [x] 5.1 Delete `packages/api/src/lib/fetch-film-art.ts` and `packages/api/test/fetch-film-art.test.ts`; verify with `npm run typecheck -w @lr/api` and `npm run test -w @lr/api`
- [x] 5.2 Remove `OG_IMAGE_RE` and `parseOgImage()` from `packages/api/src/lib/parse.ts`; verify with `npm run typecheck -w @lr/api`

## 6. Update tests and config

- [x] 6.1 Update `packages/api/test/routes.test.ts`: adjust `watchlistMocks()` to handle TMDB requests (mock returns no poster), update assertion for `artworkUrl` to allow `string | undefined`; verify with `npm run test -w @lr/api`
- [ ] 6.2 Add `TMDB_API_KEY=` and optional `TMDB_POSTER_SIZE=w500` to `.env`

## 7. Update spec

- [x] 7.1 Archive the delta spec `openspec/changes/tmdb-artwork-provider/specs/spin/spec.md` into the main spin spec at `openspec/specs/spin/spec.md` by applying the MODIFIED requirement; verify with `openspec validate`

## 8. Final verification

- [x] 8.1 Run full test suite: `npm run build && npm test` from repo root; confirm all tests pass
- [x] 8.2 Run typecheck: `npm run typecheck` from repo root; confirm no type errors
