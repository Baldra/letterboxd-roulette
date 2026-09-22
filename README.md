# Letterboxd Roulette

Random film picker for Letterboxd watchlists and public lists.

**[Live App](https://letterboxd-roulette-j5k0.onrender.com/)**

## What it does

Enter a Letterboxd username or list URL, spin, and get a random film. Picks uniformly at random from any public watchlist or list — no need to fetch every page.

## Features

- **Short-form input** — `username` for watchlists, `username/list-slug` for public lists
- **Uniform random selection** — smart sampling across paginated lists without fetching all pages
- **Film artwork** — poster images via TMDB, fetched asynchronously after the spin
- **Movie-themed errors** — random Giphy GIFs for each error type
- **Rate limiting** — 30 spins per minute per IP
- **Letterboxd aesthetic** — dark theme, slot-machine animation

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict) |
| Backend | [Hono](https://hono.dev/) |
| Frontend | React 19 + Vite 8 |
| Monorepo | npm workspaces |
| Testing | node:test (API), Vitest (web) |
| Deployment | Render |

## Getting started

### Prerequisites

- Node.js 22+
- npm
- TMDB API key (for film artwork)
- Giphy API key (for error GIFs)

### Setup

```bash
git clone https://github.com/baldra/letterboxd-roulette.git
cd letterboxd-roulette
npm install
```

Create a `.env` file:

```
TMDB_API_KEY=your_tmdb_key
GIPHY_API_KEY=your_giphy_key
```

### Development

```bash
npm run dev
```

This starts both the API server and Vite dev server concurrently.

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Type check

```bash
npm run typecheck
```

## API

All endpoints are prefixed with `/api`.

### `GET /api/spin?q=<query>`

Pick a random film from a Letterboxd list.

| Parameter | Description |
|-----------|-------------|
| `q` | `username` (watchlist) or `username/list-slug` (public list) |

**Response (200):**

```json
{
  "film": {
    "title": "The Godfather",
    "year": "1972",
    "slug": "the-godfather",
    "url": "https://letterboxd.com/film/the-godfather/"
  },
  "list": {
    "owner": "someuser",
    "url": "https://letterboxd.com/someuser/watchlist/",
    "count": 160,
    "label": "someuser"
  }
}
```

Artwork is fetched asynchronously. Poll `/api/artwork` for the poster URL.

### `GET /api/artwork?slug=<film-slug>`

Returns the cached TMDB poster URL for a film.

### `GET /api/gif?reason=<key>`

Returns a random Giphy GIF URL for an error reason. Valid reasons: `invalid-input`, `not-found`, `empty-or-private`, `rate-limited`, `upstream`, `offline`.

## Project structure

```
letterboxd-roulette/
├── packages/
│   ├── api/          # Hono API server
│   ├── web/          # React frontend (Vite)
│   └── shared/       # Shared TypeScript types
├── openspec/         # Design specs
├── Dockerfile
└── render.yaml
```

## License

MIT
