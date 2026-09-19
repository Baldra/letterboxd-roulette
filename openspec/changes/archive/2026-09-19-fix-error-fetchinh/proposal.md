## Why

The `.env` file is never loaded into `process.env` at runtime. There is no `dotenv` package and no loader configured, so `process.env.TMDB_API_KEY` is always `undefined`. The TMDB provider sees an empty key, returns early, and no poster is ever fetched.

## What Changes

- Install `dotenv` in `@lr/api`
- Load `.env` programmatically in `server.ts` with an explicit path resolved relative to the source file, so it works regardless of `process.cwd()` (monorepo workspace runs from `packages/api/`, not the repo root)

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

> This is a pure tooling fix — no spec-level behavior changes.

## Impact

- `packages/api/package.json` — new `dotenv` dependency
- `packages/api/src/server.ts` — replaces `import 'dotenv/config'` with explicit `config({ path })` pointing to repo root `.env`
