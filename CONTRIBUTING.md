# Contributing to Letterboxd Roulette

Thanks for your interest in contributing! Here's how to get started.

## Development setup

1. Fork and clone the repo
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your API keys
4. Start the dev server: `npm run dev`

## Project structure

This is an npm workspaces monorepo with three packages:

- `packages/shared` — Shared TypeScript types
- `packages/api` — Hono API server
- `packages/web` — React frontend (Vite)

## Making changes

1. Create a branch from `main`
2. Make your changes
3. Run `npm run typecheck` to check types
4. Run `npm test` to run tests
5. Submit a pull request

## Code style

- TypeScript strict mode
- No comments unless requested
- Follow existing patterns in the codebase

## Reporting issues

Open an issue on GitHub with:

- What you expected
- What actually happened
- Steps to reproduce
