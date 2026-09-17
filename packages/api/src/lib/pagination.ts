export const PAGE_SIZE = 28;

export interface TotalCountInput {
  pageCount: number;
  lastPageFilmCount: number;
}

/**
 * Total film count across all pages from the pagination metadata. An empty
 * last page (r === 0) means the list is an exact multiple of `PAGE_SIZE`, so
 * the real last full page is `pageCount - 1`.
 */
export function computeFilmCount(pageCount: number, lastPageFilmCount: number): number {
  const pages = lastPageFilmCount === 0 ? pageCount - 1 : pageCount;
  const remainder = lastPageFilmCount === 0 ? PAGE_SIZE : lastPageFilmCount;
  return PAGE_SIZE * (pages - 1) + remainder;
}