import { type Film, type ListInfo } from '@lr/shared';
import { badGateway, notFound, serviceUnavailable, unprocessable } from './errors.js';
import { fetchFilmArt, NEGATIVE_TTL_MS, ARTWORK_PAGE_TTL_MS } from './fetch-film-art.js';
import { type LetterboxdClient } from './letterboxd-client.js';
import { detectListState } from './list-meta.js';
import { parseFilms, parseListLabel, parseMaxPage } from './parse.js';
import { computeFilmCount } from './pagination.js';
import { pick } from './sampler.js';
import { type ResolvedQuery } from './url-resolver.js';

export const LIST_PAGE_TTL_MS = 600_000;

export interface SpinResult {
  film: Film;
  list: ListInfo;
}

function pageUrl(baseUrl: string, page: number): string {
  return `${baseUrl}page/${page}/`;
}

/**
 * Uniform spin: page 1 -> metadata + list label, last page -> remainder,
 * one weighted page fetch, then artwork. Reuses pages it has already fetched
 * and never fetches the whole list.
 */
export class SpinEngine {
  constructor(private readonly client: LetterboxdClient) {}

  async spin(resolved: ResolvedQuery): Promise<SpinResult> {
    const page1 = await this.client.fetchPage(resolved.url, LIST_PAGE_TTL_MS, NEGATIVE_TTL_MS);
    if (page1.status !== 200 && page1.status !== 404) {
      throw badGateway('Unexpected upstream error from Letterboxd');
    }

    const meta = detectListState(page1.html, page1.status);
    if (meta.state === 'challenged') {
      throw serviceUnavailable(meta.message ?? 'Letterboxd is temporarily blocking requests');
    }
    if (meta.state === 'not_found') {
      const message = resolved.listSlug ? 'List not found' : 'User not found';
      throw notFound(message);
    }
    if (meta.state === 'private') {
      throw unprocessable(meta.message ?? 'This list is private');
    }
    if (meta.state === 'empty') {
      throw unprocessable(meta.message ?? 'This list is empty');
    }

    const pageOneFilms = parseFilms(page1.html);
    const maxPage = parseMaxPage(page1.html);

    let count: number;
    let target: { page: number; slot: number };
    let lastPageFilms: Film[] | undefined;

    if (maxPage <= 1) {
      count = pageOneFilms.length;
      target = pick(1, count);
    } else {
      const last = await this.client.fetchPage(
        pageUrl(resolved.url, maxPage),
        LIST_PAGE_TTL_MS,
        NEGATIVE_TTL_MS,
      );
      lastPageFilms = parseFilms(last.html);
      count = computeFilmCount(maxPage, lastPageFilms.length);
      target = pick(maxPage, lastPageFilms.length);
    }

    const page =
      target.page === 1
        ? pageOneFilms
        : target.page === maxPage && lastPageFilms
          ? lastPageFilms
          : parseFilms(
              (
                await this.client.fetchPage(
                  pageUrl(resolved.url, target.page),
                  LIST_PAGE_TTL_MS,
                  NEGATIVE_TTL_MS,
                )
              ).html,
            );

    const entry = page[target.slot - 1];
    if (!entry) {
      throw badGateway('Letterboxd page did not contain the expected film');
    }

    const artworkUrl = await fetchFilmArt(this.client, entry.slug);
    const film: Film = {
      title: entry.title,
      year: entry.year,
      slug: entry.slug,
      url: entry.url,
      ...(artworkUrl ? { artworkUrl } : {}),
    };

    const list: ListInfo = {
      owner: resolved.owner,
      url: resolved.url,
      count,
      label: parseListLabel(page1.html) ?? resolved.owner,
    };

    return { film, list };
  }
}