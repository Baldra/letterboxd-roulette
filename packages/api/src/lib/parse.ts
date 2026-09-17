export const LETTERBOXD_ORIGIN = 'https://letterboxd.com';

export interface FilmEntry {
  title: string;
  year: string;
  slug: string;
  url: string;
  lid: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&bull;': '•',
  '&lrm;': '',
};

export function decodeEntities(input: string): string {
  return input.replace(/&[a-z#0-9]+;/gi, (match) => NAMED_ENTITIES[match.toLowerCase()] ?? match);
}

const POSTER_TAG_RE = /<div\b[^>]*data-component-class="LazyPoster"[^>]*>/gi;

function attribute(tag: string, name: string): string | undefined {
  const double = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  if (double?.[1] !== undefined) return double[1];
  const single = tag.match(new RegExp(`\\s${name}='([^']*)'`));
  return single?.[1];
}

/**
 * Extract the Letterboxd library id (`film:<id>`) from the LazyPoster's
 * `data-postered-identifier` JSON, e.g. `{"lid":"..","uid":"film:18144",..}`.
 */
function lidFromPosteredIdentifier(value: string): string {
  const decoded = decodeEntities(value);
  const match = decoded.match(/"uid"\s*:\s*"film:(\d+)"/);
  return match ? `film:${match[1]}` : '';
}

function splitTitleAndYear(itemName: string): { title: string; year: string } {
  const match = itemName.match(/^(.*)\s+\((\d{4})\)$/);
  if (match) return { title: match[1] ?? '', year: match[2] ?? '' };
  return { title: itemName, year: '' };
}

export function parseFilms(html: string): FilmEntry[] {
  const films: FilmEntry[] = [];
  for (const match of html.matchAll(POSTER_TAG_RE)) {
    const tag = match[0];
    const itemName = attribute(tag, 'data-item-name');
    const slug = attribute(tag, 'data-item-slug');
    const link = attribute(tag, 'data-item-link');
    const postered = attribute(tag, 'data-postered-identifier');
    if (!itemName || !slug || !link) continue;
    const { title, year } = splitTitleAndYear(decodeEntities(itemName));
    films.push({
      title,
      year,
      slug,
      url: `${LETTERBOXD_ORIGIN}${link}`,
      lid: postered ? lidFromPosteredIdentifier(postered) : '',
    });
  }
  return films;
}

const PAGE_HREF_RE = /\/page\/(\d+)\//g;
const CURRENT_PAGE_RE = /class="paginate-page paginate-current"[^>]*>\s*<span>\s*(\d+)\s*<\/span>/;

/**
 * Read the max page number from the pagination tail. Uses any `/page/N/`
 * links plus the current page marker, taking the largest number found.
 * Returns 1 when the page has no pagination.
 */
export function parseMaxPage(html: string): number {
  let max = 1;
  for (const match of html.matchAll(PAGE_HREF_RE)) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const current = html.match(CURRENT_PAGE_RE);
  if (current?.[1]) {
    const n = Number(current[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

const TITLE_RE = /<title>\s*(?:&lrm;)?([^<]*)<\/title>/;

export function parseListLabel(html: string): string | null {
  const match = html.match(TITLE_RE);
  if (!match?.[1]) return null;
  return decodeEntities(match[1])
    .replace(/\s*[•|]\s*Letterboxd\s*$/i, '')
    .trim();
}

const OG_IMAGE_RE = /<meta\s+property="og:image"\s+content="([^"]+)"/;

export function parseOgImage(html: string): string | null {
  return html.match(OG_IMAGE_RE)?.[1] ?? null;
}