import { PAGE_SIZE } from './pagination.js';

export interface PickResult {
  /** 1-based page number to fetch. */
  page: number;
  /** 1-based slot within the page. */
  slot: number;
}

/**
 * Uniform pick across a paginated list without fetching every page.
 * `pageCount` is the number of pages (`P`), `lastPageFilmCount` is how many
 * films are on the (possibly partial) last page (`r`). An empty last page
 * means an exact multiple of `PAGE_SIZE` and is handled by treating the
 * previous page as the last full page.
 */
export function pick(
  pageCount: number,
  lastPageFilmCount: number,
  rng: () => number = Math.random,
): PickResult {
  const pages = lastPageFilmCount === 0 ? pageCount - 1 : pageCount;
  const remainder = lastPageFilmCount === 0 ? PAGE_SIZE : lastPageFilmCount;
  const total = PAGE_SIZE * (pages - 1) + remainder;
  const t = Math.floor(rng() * total) + 1;
  const page = Math.ceil(t / PAGE_SIZE);
  const slot = ((t - 1) % PAGE_SIZE) + 1;
  return { page, slot };
}