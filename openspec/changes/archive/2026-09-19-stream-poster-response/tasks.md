## 1. Decouple artwork from spin response

- [x] 1.1 Modify `SpinEngine.spin()` to return film data without awaiting artwork — verify: `npm run test -w @lr/api` (spin tests pass with artwork omitted)
- [x] 1.2 Add an artwork cache (`TtlCache`) in `app.ts` shared between spin and artwork routes — verify: `npm run build -w @lr/api`
- [x] 1.3 Update spin route to fire-and-forget artwork fetch, writing result to the cache — verify: spin response returns without `artworkUrl`

## 2. Artwork polling endpoint

- [x] 2.1 Create `GET /api/artwork?slug=<slug>` route that reads from the artwork cache — verify: returns `null` when artwork not yet ready
- [x] 2.2 Wire artwork route into `app.ts` — verify: `npm run test -w @lr/api`

## 3. Frontend integration

- [x] 3.1 Update `packages/web` spin component to poll `/api/artwork?slug=<slug>` after receiving spin response — verify: poster appears after brief delay
- [x] 3.2 Add retry/polling logic with backoff (max 3 attempts, 300ms interval) — verify: poster loads or gracefully omits

## 4. Verify

- [x] 4.1 Run full test suite: `npm run build && npm test` — all tests pass
- [x] 4.2 Run typecheck: `npm run typecheck` — no type errors
