## MODIFIED Requirements

### Requirement: Result film data

The spin response SHALL include the picked film's title, release year, Letterboxd slug, film URL, and gallery artwork URL when one is available; when artwork cannot be obtained the service SHALL omit the artwork rather than fail the request. Artwork SHALL be resolved via the TMDB search API using the film's title and year; when the title-and-year search returns no results the service SHALL retry with the title alone before falling back to omitting artwork.

#### Scenario: Full film data with artwork
- **WHEN** a spin returns a film and TMDB search returns a poster for the film's title and year
- **THEN** the response includes title, year, slug, film URL, and that poster URL as `artworkUrl`

#### Scenario: Artwork fallback to title-only search
- **WHEN** a spin returns a film but the TMDB title-and-year search returns no results while a title-only search does return a poster
- **THEN** the response includes that poster URL as `artworkUrl`

#### Scenario: Artwork unavailable does not fail the spin
- **WHEN** a spin returns a film but TMDB search returns no results for either query, the API is unreachable, or no API key is configured
- **THEN** the service still returns the film without `artworkUrl`
