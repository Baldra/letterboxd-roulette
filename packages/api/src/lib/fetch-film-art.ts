import { type LetterboxdClient } from './letterboxd-client.js';
import { LETTERBOXD_ORIGIN, parseOgImage } from './parse.js';

export const ARTWORK_PAGE_TTL_MS = 24 * 60 * 60 * 1000;
export const NEGATIVE_TTL_MS = 60_000;

/**
 * Best-effort artwork lookup from a film page's `og:image`. Any failure
 * (throttled, not found, no meta tag) yields `undefined`; the caller omits
 * `artworkUrl` rather than failing the spin.
 */
export async function fetchFilmArt(
  client: LetterboxdClient,
  slug: string,
): Promise<string | undefined> {
  try {
    const page = await client.fetchPage(
      `${LETTERBOXD_ORIGIN}/film/${slug}/`,
      ARTWORK_PAGE_TTL_MS,
      NEGATIVE_TTL_MS,
    );
    if (page.status !== 200) return undefined;
    return parseOgImage(page.html) ?? undefined;
  } catch {
    return undefined;
  }
}