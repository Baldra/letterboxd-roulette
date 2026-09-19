## 1. Install and configure dotenv

- [x] 1.1 Install `dotenv` in `@lr/api` — verify with `npm ls dotenv -w @lr/api`
- [x] 1.2 Add `import 'dotenv/config'` at the top of `packages/api/src/server.ts` — verify with `npm run build -w @lr/api`

## 2. Fix path resolution

- [x] 2.1 Replace `import 'dotenv/config'` with explicit `config({ path })` resolved from `import.meta.url` so `.env` is found regardless of `cwd` — verify with `npm run start -w @lr/api` and confirm `apiKey` is populated in the options log

## 3. Verify

- [x] 3.1 Run test suite — all tests pass
