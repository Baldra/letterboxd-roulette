# web-ui Specification

## Purpose

The single-page, Letterboxd-styled React frontend through which a user enters a short-form query, spins, and is presented with their random film.

## Requirements

### Requirement: Short-form input and submit

The page SHALL provide a single text field and a submit action. The user MAY type a bare username or `username/list-slug`. Submitting issues a spin request for the entered query; pressing Enter in the field SHALL also submit.

#### Scenario: Submit a username
- **WHEN** a user types `username` and submits
- **THEN** the page performs a spin against that user's watchlist

#### Scenario: Submit a username and list
- **WHEN** a user types `username/oscars-2026` and submits
- **THEN** the page performs a spin against that public list

#### Scenario: Enter key submits
- **WHEN** the input has focus and the user presses Enter
- **THEN** the page performs a spin with the current input value

### Requirement: Query persists in the URL

The page SHALL keep the current query in the `q` URL parameter so reloads and shares preserve it: on load, a present `q` SHALL populate the input, and after submit the `q` parameter SHALL update without a full page reload.

#### Scenario: Reload preserves the query
- **WHEN** a page is served with `?q=username` in the URL
- **THEN** the input is pre-filled with `username`

#### Scenario: Submit updates the URL
- **WHEN** a user submits a query
- **THEN** the URL's `q` parameter reflects that query via history update (no reload)

### Requirement: Result card

On a successful spin the page SHALL display a result card showing the film's artwork (when provided), title, release year, the list label and film count it came from, a link to the film's Letterboxd page, and a "Spin again" control.

#### Scenario: Successful spin shows the film
- **WHEN** a spin succeeds
- **THEN** the page renders the artwork or a styled placeholder, the title with year, the source list label and count, a link to the film page on Letterboxd, and a spin-again control

#### Scenario: Spin again re-rolls
- **WHEN** the user activates the spin-again control
- **THEN** the page issues a new spin for the same query

### Requirement: Error presentation

The page SHALL render each spin failure as a readable message that distinguishes not-found, private or empty list, invalid input, and upstream unavailability; the input SHALL remain editable after any error.

#### Scenario: Statement of the error
- **WHEN** a spin fails
- **THEN** the page shows a message derived from the error status and leaves the input editable

### Requirement: Letterboxd-inspired theme

The page SHALL present a visual theme modeled on Letterboxd's site: near-black navy background (`#14181c`), white/light title text, muted gray-blue secondary text, and a green accent for the primary action; the layout SHALL stay a simple centered single column.

#### Scenario: Theme applied
- **WHEN** the page renders
- **THEN** the background, text, and action colors match the Letterboxd-inspired palette and the layout is a centered single column

### Requirement: Pending state during spin

While a spin is in flight the page SHALL disable the submit action and indicate the request is pending, SHALL remain responsive to disclosure, and SHALL clear the pending state when the request settles.

#### Scenario: Submit disabled while pending
- **WHEN** a spin request is in flight
- **THEN** the submit action is disabled and a pending indicator is shown