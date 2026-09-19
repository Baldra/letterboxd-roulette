# spin Specification

## Purpose

Server-side selection of one random film from any public Letterboxd watchlist or list, exposed as a stateless HTTP API with bounded outbound traffic to letterboxd.com.

## Requirements

### Requirement: Input resolution

The spin service SHALL accept a short-form query in one of two formats: a bare username (`username`) meaning that user's watchlist, or `username/list-slug` meaning that user's public list at `https://letterboxd.com/<username>/list/<list-slug>/`. It SHALL reject anything else as invalid input.

#### Scenario: Bare username resolves to watchlist
- **WHEN** a user requests a spin with query `username`
- **THEN** the service resolves the source to `https://letterboxd.com/username/watchlist/`

#### Scenario: Username and list-slug resolves to public list
- **WHEN** a user requests a spin with query `username/oscars-2026`
- **THEN** the service resolves the source to `https://letterboxd.com/username/list/oscars-2026/`

#### Scenario: Malformed input is rejected
- **WHEN** a user requests a spin with a malformed query (empty, more than two segments, invalid characters, or a full URL)
- **THEN** the service responds with HTTP `400` and an explanatory error

### Requirement: Uniform random selection

The spin service SHALL return exactly one film chosen uniformly at random from the resolved list, without fetching the full list when it spans multiple pages.

#### Scenario: Spin returns a film from the list
- **WHEN** a user requests a spin on a non-empty list
- **THEN** the response contains a single film whose slug resolves within that list

#### Scenario: Multi-page list sampled without full fetch
- **WHEN** a list spans more than one page
- **THEN** the service selects the result using only page metadata plus the pages needed for a uniform draw, never all pages

#### Scenario: Empty list yields no film
- **WHEN** a user requests a spin on a list with zero films
- **THEN** the service responds with HTTP `422` explaining the list is empty

### Requirement: List identity and size in response

The spin response SHALL identify the source list by owner, display label, URL, and total film count.

#### Scenario: Response includes list metadata
- **WHEN** a spin succeeds on a watchlist of 160 films
- **THEN** the response includes the owner username, the list label, the canonical list URL, and count `160`

### Requirement: Result film data

The spin response SHALL include the picked film's title, release year, Letterboxd slug, and film URL. The response SHALL NOT await artwork; artwork SHALL be fetched in the background after the spin response is sent. The client SHALL retrieve artwork separately via the artwork polling endpoint.

#### Scenario: Spin returns film data without artwork
- **WHEN** a user requests a spin on a non-empty list
- **THEN** the response includes title, year, slug, and film URL, but `artworkUrl` is omitted or `null`

#### Scenario: Full film data with artwork
- **WHEN** a user requests a spin and the background artwork fetch completes successfully with a poster from TMDB
- **THEN** the artwork polling endpoint returns the poster URL for that film (the spin response itself does not include artwork)

#### Scenario: Artwork fallback to title-only search
- **WHEN** a user requests a spin and the background TMDB title-and-year search returns no results while a title-only search does return a poster
- **THEN** the artwork polling endpoint returns that poster URL

#### Scenario: Artwork unavailable does not fail the spin
- **WHEN** a user requests a spin but the background artwork fetch fails, times out, or returns no results
- **THEN** the service still returns the film without artwork, and the artwork polling endpoint returns null

### Requirement: Artwork polling endpoint

The service SHALL expose a GET endpoint at `/api/artwork` that accepts a film identifier (slug or composite key) and returns the artwork URL for that film once it has been fetched, or a pending/null state if not yet available.

#### Scenario: Artwork available
- **WHEN** a client requests artwork for a film whose background fetch has completed with a poster
- **THEN** the response contains the poster URL

#### Scenario: Artwork pending
- **WHEN** a client requests artwork for a film whose background fetch is still in progress
- **THEN** the response contains a pending/null state indicating artwork is not yet ready

#### Scenario: Artwork not found
- **WHEN** a client requests artwork for a film identifier that is unknown or has expired from cache
- **THEN** the response contains a null state

### Requirement: Error handling

The spin service SHALL map failures to a stable, documented set of HTTP statuses: `400` invalid input, `404` user or list not found, `422` private or empty list, `503` upstream throttling or unavailability (with a retry hint), and `502` unexpected upstream failure. Error responses SHALL be JSON with a human-readable message.

#### Scenario: Nonexistent user
- **WHEN** a user requests a spin where the username does not exist on Letterboxd
- **THEN** the service responds with HTTP `404`

#### Scenario: Nonexistent list
- **WHEN** a user requests a spin with `username/list-slug` where the list does not exist
- **THEN** the service responds with HTTP `404` distinguishing the list from the user

#### Scenario: Private list
- **WHEN** a user requests a spin on a list that is not publicly visible
- **THEN** the service responds with HTTP `422` explaining the list is private

#### Scenario: Upstream throttling
- **WHEN** Letterboxd rate-limits or challenges outbound requests
- **THEN** the service responds with HTTP `503` and a `Retry-After` hint rather than surfacing a partial result

### Requirement: Abuse protection and bounded outbound traffic

The spin service SHALL cap inbound spins per client IP and SHALL bound concurrent and total outbound requests to Letterboxd, reusing a short-lived in-memory page cache to serve repeat spins without refetching.

#### Scenario: Per-IP rate limit exceeded
- **WHEN** a client exceeds the configured per-IP spin rate
- **THEN** the service responds with HTTP `429` and does not fetch from Letterboxd

#### Scenario: Repeat spins reuse cache
- **WHEN** two spins target the same list within the cache TTL
- **THEN** the second spin reuses cached pages and does not refetch pages already fetched by the first

### Requirement: Honest client identification

The service SHALL send an identifying User-Agent on all outbound requests stating the application name and a contact, so operators of Letterboxd can attribute the traffic.

#### Scenario: Outbound request carries identifying User-Agent
- **WHEN** the service fetches any public Letterboxd page
- **THEN** the request includes a User-Agent naming the application and a contact address

## Design Notes

The film metadata `json/` endpoint on letterboxd.com is protected by a Cloudflare challenge and is out of scope as a data source; gallery artwork is sourced from the TMDB search API using the film's title and year.
