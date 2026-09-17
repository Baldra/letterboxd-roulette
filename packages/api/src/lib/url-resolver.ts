import { LETTERBOXD_ORIGIN } from './parse.js';

export interface ResolvedQuery {
  owner: string;
  listSlug?: string;
  url: string;
}

const SEGMENT_RE = /^[A-Za-z0-9_-]+$/;

/**
 * Map a short-form query to a canonical Letterboxd URL.
 * `username` -> watchlist, `username/list-slug` -> public list.
 * Returns null for anything else (empty, >2 segments, invalid characters,
 * or a full URL).
 */
export function resolveQuery(input: string): ResolvedQuery | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith('/')) return null;
  if (trimmed.includes('://') || trimmed.includes('.')) return null;

  const segments = trimmed.split('/');
  if (segments.length > 2) return null;

  const owner = segments[0];
  if (!owner || !SEGMENT_RE.test(owner)) return null;

  const listSlug = segments[1];
  if (listSlug !== undefined && listSlug.trim() === '') return null;
  if (listSlug !== undefined && !SEGMENT_RE.test(listSlug)) return null;

  const url = listSlug
    ? `${LETTERBOXD_ORIGIN}/${owner}/list/${listSlug}/`
    : `${LETTERBOXD_ORIGIN}/${owner}/watchlist/`;

  return { owner, listSlug, url };
}