## 1. Brand logo and spin animation

- [x] 1.1 Add `components/Brand.tsx` rendering the three-circle mark (orange `#ff8000`, green `#00e054`, blue `#0ea2cc`) plus "Letterboxd Roulette" wordmark with a `spinning` prop that toggles a class; verify a `Brand` test asserts the three circles and wordmark render
- [x] 1.2 Update the `App.tsx` header to render `<Brand spinning={state.kind === 'pending'} />` replacing the plain `<h1>`; verify `npm run typecheck -w @lr/web` passes
- [x] 1.3 Add CSS keyframes spinning the three-circle strip like a slot reel (seamless one-period loop) plus a `prefers-reduced-motion` override removing the loop in `styles.css`; verify a `Brand` test asserts the spinning class is present while pending and absent once settled

## 2. How-to help text

- [x] 2.1 Add a muted help line under the form label in `SpinForm.tsx` explaining the `username` and `username/list-slug` formats and the one-random-film outcome; verify the copy renders using the existing `--lb-muted` token

## 3. GIF endpoint (API)

- [x] 3.1 Add `lib/gif-provider.ts` mapping the six reason keys to movie-keyword search queries and calling the Giphy Search endpoint with `GIPHY_API_KEY`, picking a random result from the top hits; verify a unit test asserts reason-to-query mapping, provider URL construction, and error handling with a mocked fetch
- [x] 3.2 Add `routes/gif.ts` exposing `GET /api/gif?reason=<key>` returning `{ url }` and rejecting unknown/missing reasons with `400`; wire it into `createApp`; verify route tests plus `npm run typecheck -w @lr/api` pass
- [x] 3.3 Cache provider results in the shared `TtlCache` (~24 h per reason) through the existing outbound `Semaphore`; verify a test asserts the provider is hit once across repeated requests within the TTL and that the semaphore is shared with the spin path

## 4. Error GIFs and message simplification (web)

- [x] 4.1 Add `lib/errorGifs.ts` with a status-to-reason classifier (`invalid-input`, `not-found`, `empty-or-private`, `rate-limited`, `upstream`, `offline`), `localGifUrl`, and a timed `randomGifUrl` fetch against `/api/gif`; verify a unit test maps 400/404/422/429/502/503/0 to the expected reason and that `randomGifUrl` falls back to `null` on timeout/HTTP error
- [x] 4.2 Collapse `errorMessages.ts` to two user-facing messages (the unified "Nothing found — the list may be empty, private, or doesn't exist." for every status except 429, which keeps the "too many spins" copy) and add `components/ErrorPanel.tsx` rendering `role="alert"` with the local GIF at movie-poster proportions (2:3), no red error block, swapping in the API GIF on success, and cascading to message-only if the local image fails to load; verify a component test covers the message split and the API-success/fallback paths
- [x] 4.3 Wire the `App.tsx` error branch to `ErrorPanel`; verify `npm run typecheck -w @lr/web` passes

## 5. Fallback assets, tests, and full verification

- [x] 5.1 Keep the six fallback GIF assets under `packages/web/public/gifs/<reason>.gif` matching the reason keys; verify `npm run build -w @lr/web` copies them to the `web/dist` output
- [x] 5.2 Update `test/Brand.test.tsx`, `test/errorGifs.test.tsx`, and `test/ErrorPanel.test.tsx` (three-circle mark, poster-proportioned GIF, message split); verify `npm run test -w @lr/web` passes
- [x] 5.3 Re-run `npm run typecheck` and `npm test` for `@lr/api`; verify both are clean
- [x] 5.4 Re-run root `npm run typecheck` and `npm test`; verify the whole workspace stays green