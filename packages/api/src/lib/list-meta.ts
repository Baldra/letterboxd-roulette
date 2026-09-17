import { parseFilms } from './parse.js';

export const CHALLENGE_PATTERNS = [
  /Just a moment\.{0,3}/i,
  /challenge-running/i,
  /id="challenge-form"/,
  /cf-chl-(?:challenge|widget|error)/,
  /checking your browser before accessing/i,
] as const;

export type ListPageState = 'ok' | 'not_found' | 'private' | 'empty' | 'challenged';

export interface ListMeta {
  state: ListPageState;
  message?: string;
}

/**
 * Classify a fetched list page. Order matters: Cloudflare challenges and
 * not-found wins over generic get-an-emailed-empty guesses.
 */
export function detectListState(html: string, status: number): ListMeta {
  if (CHALLENGE_PATTERNS.some((re) => re.test(html))) {
    return { state: 'challenged', message: 'Letterboxd is temporarily blocking requests' };
  }
  if (status === 404 || /<title>[^<]*not found[^<]*<\/title>/i.test(html)) {
    return { state: 'not_found', message: 'User or list not found' };
  }
  if (
    /this list is private|this list has been set to private|"private":"private"/i.test(html) ||
    /<h1[^>]*>private<\/h1>/i.test(html) ||
    /<title>\s*(?:&lrm;)?private[^<]*<\/title>/i.test(html)
  ) {
    return { state: 'private', message: 'This list is private' };
  }
  const films = parseFilms(html);
  if (films.length === 0) {
    return { state: 'empty', message: 'This list is empty' };
  }
  return { state: 'ok' };
}