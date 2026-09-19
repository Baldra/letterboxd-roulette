## MODIFIED Requirements

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

## ADDED Requirements

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
