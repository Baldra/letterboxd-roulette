## 1. Workspace scaffold

- [x] 1.1 Set up npm workspaces root `package.json` (`packages/shared`, `packages/api`, `packages/web`) with `@lr/shared` dependency wiring, and verify `npm install` resolves all three workspaces
- [x] 1.2 Configure TypeScript strict base config per package, plus `dev`/`build`/`test`/`typecheck` root scripts, and verify `npm run typecheck` passes on the empty scaffold
- [x] 1.3 Add `packages/shared/src/types.ts` with `Film`, `ListInfo`, `SpinResponse`, `ApiError`, export from `index.ts`, and verify `tsc --strict` compiles it

## 2. Letterboxd HTML parsing

- [x] 2.1 Capture real fixture HTML (list page, paginated tail, last page with remainder, film page with `og:image`) into `packages/api/test/fixtures/`, stripping volatile content, and verify fixtures load in tests
- [x] 2.2 Implement `parse.ts` to extract film entries (`title`, `year`, `slug`, `url`, LID) from `data-component-class="LazyPoster"` blocks and to read the max page number from the pagination tail, and verify parser unit tests against fixtures pass
- [x] 2.3 Implement list-meta detection for not-found, private, empty, and Cloudflare-challenged pages from the fetched HTML, and verify each detection has a passing unit test
- [x] 2.4 Implement `pageSize` constant (28) and helpers to compute total count from `P`, `r`, and an edge case where the last page is empty (r = 0 ⇒ treat P−1 as last), and verify with unit tests including the exact-multiple case

## 3. Uniform sampler

- [x] 3.1 Implement `sampler.ts` per design.md — page 1 → last-page remainder → single random index → target page; expose a pure `pick(pageCount, remainder)` that the page-fetch layer drives, and verify uniformity statistically over a large sample in a seeded unit test
- [x] 3.2 Wire the sampler to the fetch layer so a spin fetches only page 1, the last page (when `P > 1`), and the target page, reusing already-fetched pages, and verify with a mock-fetch test counting outbound calls

## 4. Caching and rate limiting

- [x] 4.1 Implement `cache.ts` — in-memory TTL map (list pages ~600 s, artwork ~24 h, negative results ~60 s), lazy expiry, size cap, and verify TTL/expiry/size-cap unit tests pass
- [x] 4.2 Implement `limiter.ts` — per-IP sliding window replaying toward `429` with no outbound fetch, and verify a unit test exceeds the window and is rejected
- [x] 4.3 Implement the outbound pipeline — concurrency semaphore (default 4), honest identifying User-Agent, retry/backoff on upstream `403`/`429`, triggering the `503` path, and verify with a mock upstream test

## 5. Spin API and server

- [x] 5.1 Implement `url-resolver.ts` mapping `username` → `/username/watchlist/` and `username/list-slug` → `/username/list/<slug>/`, rejecting malformed queries, and verify resolver unit tests pass (including full-URL rejection)
- [x] 5.2 Implement artwork lookup `fetchFilmArt.ts` from the film page's `og:image` with `artworkUrl` omitted on failure, and verify the fixture-based unit test covers found and missing artwork
- [x] 5.3 Implement `routes/spin.ts` returning the `SpinResponse` shape and mapping failures to `400`/`404`/`422`/`429`/`503`/`502` JSON errors, with per-error integration tests using a mocked `fetch`
- [x] 5.4 Bootstrap `server.ts` on `@hono/node-server` (PORT env default 8787), mount `/api/spin`, serve `packages/web/dist` statically with an SPA fallback, and verify `curl localhost:8787/api/spin?q=username` returns JSON against mocked or live fetch

## 6. Web frontend (React + Vite)

- [x] 6.1 Scaffold `packages/web` (Vite React TS), add `@lr/shared` dependency, and verify `npm run build -w @lr/web` produces `dist/`
- [x] 6.2 Implement `SpinForm` — single input + submit, Enter submits, input and `?q=` stay in sync via history replaceState, submit disabled with pending indicator while fetching, and verify locally against the dev proxy with a stubbed `/api/spin`
- [x] 6.3 Implement `ResultCard` — artwork image (with `onerror` → styled title placeholder), title (year), list label and count, "Open on Letterboxd" link, "Spin again" re-roll, and verify rendering against mocked `SpinResponse` data
- [x] 6.4 Implement error display mapping status to a readable message with the input left editable, and verify each status message renders
- [x] 6.5 Apply the Letterboxd-inspired theme (dark `#14181c` background, light text, muted gray-blue secondary, green accent, centered single column) via plain CSS, and verify the page renders per spec (visual check)
- [x] 6.6 Configure Vite dev proxy `/api` → `http://localhost:8787`, and verify an end-to-end spin in the browser hits the Hono server

## 7. Tests and quality gates

- [x] 7.1 Run the full API test suite against checked-in fixtures and confirm all parser, sampler, cache, limiter, resolver, artwork, and route tests pass
- [x] 7.2 (Optional) Add a Vitest smoke test asserting `ResultCard` renders a successful `SpinResponse` and its error state, and verify `vitest run` passes
- [x] 7.3 Verify `npm run typecheck` and `npm run build` pass for all three packages and that Hono serves the built frontend from one process

## 8. Deployment

- [x] 8.1 Add a multi-stage `Dockerfile` (build shared + web, copy `web/dist` into the API image, `node:22-alpine` runtime, PORT 8080) and verify `docker build` succeeds and the container answers `/api/spin`
- [ ] 8.2 Add `fly.toml` for a single machine (min/max 1, PORT 8080), `fly launch`/`fly deploy`, and verify a live spin against the public `username` watchlist returns a film with artwork via the deployed URL

## 9. Integration verification

- [x] 9.1 Live-spin smoke: against letterboxd.com, verify `?q=username` (watchlist, count reported), `?q=username/<existing list>` (list pick), a nonexistent username (`404`), a nonexistent list (`404`), and rate-limit behavior after exceeding the per-IP window (`429`)
- [x] 9.2 Confirm rapid repeat spins for the same list reuse cache (no surprise outbound spikes) and that artwork renders with placeholder fallback when the image fails to load