## ADDED Requirements

### Requirement: How-to help text

The page SHALL display a short help line describing how to use the site: entering a bare Letterboxd username spins that user's watchlist, entering `username/list-slug` spins that public list, and a spin draws exactly one random film from the source.

#### Scenario: Help line shown
- **WHEN** the page renders, idle or otherwise
- **THEN** a help line explaining the `username` and `username/list-slug` input formats and the one-random-film outcome is visible

## MODIFIED Requirements

### Requirement: Error presentation

The page SHALL render spin failures with exactly two user-facing messages: a single unified line — "Nothing found — the list may be empty, private, or doesn't exist." — for every failure except rate-limiting, and the existing "too many spins" line for a rate-limit failure. The page SHALL NOT surface the underlying status or server detail for the unified cases (retry hints, upstream outages, invalid-input guidance). Each failure SHALL also show a movie-themed GIF matched to the error's reason, freshly fetched from an open GIF API so repeated failures are not always the same clip, sized in movie-poster proportions (2:3); the page SHALL fall back to a locally bundled GIF when the API is unavailable or slow; the input SHALL remain editable after any error. The failure SHALL be presented in the site's theme palette rather than a red error block.

#### Scenario: Statement of the error
- **WHEN** a spin fails for any reason other than rate-limiting
- **THEN** the page shows only the unified "Nothing found — the list may be empty, private, or doesn't exist." message (plus the reason-matched GIF) and leaves the input editable

#### Scenario: Rate limit keeps its own message
- **WHEN** a spin is rate-limited (HTTP 429)
- **THEN** the page shows the "too many spins" message instead of the unified message

#### Scenario: Reason-matched error GIF at poster proportions
- **WHEN** a spin fails with a known reason (invalid input, not found, private or empty, rate-limited, upstream unavailability, or offline)
- **THEN** the page requests a fresh random movie-themed GIF for that reason from the GIF API endpoint and shows it at movie-poster proportions (2:3) alongside the message, with the message shown alone if the GIF cannot load

#### Scenario: Local fallback on API failure
- **WHEN** the GIF API is unreachable, slow, or returns an error while a failure is being displayed
- **THEN** the page shows the locally bundled GIF for that reason instead of the API-sourced one

### Requirement: Letterboxd-inspired theme

The page SHALL present a visual theme modeled on Letterboxd's site: near-black navy background (`#14181c`), white/light title text, muted gray-blue secondary text, and a green accent for the primary action; the layout SHALL stay a simple centered single column. The header SHALL render a Letterboxd-style brand logo whose mark is three circles in the orange (`#ff8000`), green (`#00e054`), and blue (`#0ea2cc`) of Letterboxd's branding, plus the wordmark, rather than plain text.

#### Scenario: Theme applied
- **WHEN** the page renders
- **THEN** the background, text, and action colors match the Letterboxd-inspired palette and the layout is a centered single column

#### Scenario: Brand logo rendered
- **WHEN** the page renders
- **THEN** the header shows a brand logo with a mark of three circles in orange, green, and blue, plus the site wordmark

### Requirement: Pending state during spin

While a spin is in flight the page SHALL disable the submit action, run a slot-machine style spin animation on the brand logo, SHALL remain responsive to disclosure, and SHALL clear the pending state when the request settles.

#### Scenario: Submit disabled while pending
- **WHEN** a spin request is in flight
- **THEN** the submit action is disabled and a pending indicator is shown

#### Scenario: Logo spins while pending
- **WHEN** a spin request is in flight
- **THEN** the brand logo's three-circle mark animates like a spinning slot-machine reel

#### Scenario: Logo settles when spin ends
- **WHEN** the spin request settles (success or error)
- **THEN** the logo stops animating and the settled result (film or error) is displayed