# gif-proxy Specification

## Purpose

Server-side selection of a random movie-themed GIF whose subject matches the error's keyword, via the Giphy search API (precise movie-keyword queries rather than generic tags), served to the web UI as a thin, cached, rate-capped endpoint under the existing API service.

## Requirements

### Requirement: Random movie GIF endpoint

The API SHALL expose `GET /api/gif?reason=<key>` supporting the reason keys `invalid-input`, `not-found`, `empty-or-private`, `rate-limited`, `upstream`, and `offline`; a request SHALL return `200` with `{ url }` naming a random movie-themed GIF selected from the Giphy search API whose subject matches the error reason's keyword, and SHALL reject an unknown or missing reason with `400`.

#### Scenario: Random movie GIF for a known reason
- **WHEN** a client requests `/api/gif?reason=not-found`
- **THEN** the service returns `200` with `{ url }` naming a Giphy movie-GIF URL whose subject matches that reason

#### Scenario: Unknown reason rejected
- **WHEN** a client requests `/api/gif?reason=bogus` or omits `reason`
- **THEN** the service responds `400` with an explanatory error

### Requirement: Bounded upstream access to the provider

The API SHALL respect the service's existing outbound concurrency caps when calling the GIF provider and SHALL cache provider results with a TTL so repeated GIF requests do not hit the Giphy API on every call.

#### Scenario: Provider calls are cached
- **WHEN** the same GIF reason is requested repeatedly within the cache TTL
- **THEN** only the first request reaches Giphy and later requests reuse the cached result

#### Scenario: Provider traffic stays capped
- **WHEN** the endpoint issues an upstream call
- **THEN** it acquires the same outbound semaphore used by spin requests, keeping total outbound concurrency bounded

### Requirement: Provider credentials stay server-side

The API SHALL read the Giphy API key from a server-side environment variable and SHALL NOT expose it in any response.

#### Scenario: Key never leaks
- **WHEN** the endpoint responds or errors
- **THEN** no response body or header contains the Giphy API key