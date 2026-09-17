import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixturePath } from './helpers.js';
import { parseFilms, parseListLabel, parseMaxPage, parseOgImage } from '../src/lib/parse.js';

test('fixtures load from disk', async () => {
  for (const name of [
    'watchlist-page-1.html',
    'watchlist-page-6.html',
    'film-the-captive.html',
  ]) {
    const html = await readFile(fixturePath(name), 'utf8');
    assert.ok(html.length > 10_000, `${name} should be non-trivial HTML`);
  }
  const notFound = await readFile(fixturePath('not-found.html'), 'utf8');
  assert.match(notFound, /Not Found|not found/i);
});

test('parseFilms reads 28 entries from the first watchlist page', async () => {
  const html = await readFile(fixturePath('watchlist-page-1.html'), 'utf8');
  const films = parseFilms(html);
  assert.equal(films.length, 28);
  const first = films[0];
  assert.ok(first);
  assert.equal(first.title, 'The Captive');
  assert.equal(first.year, '2000');
  assert.equal(first.slug, 'the-captive');
  assert.equal(first.url, 'https://letterboxd.com/film/the-captive/');
  assert.equal(first.lid, 'film:18144');
});

test('parseFilms reads the 20-film remainder from the last page', async () => {
  const html = await readFile(fixturePath('watchlist-page-6.html'), 'utf8');
  const films = parseFilms(html);
  assert.equal(films.length, 20);
});

test('parseMaxPage reads 6 from the first page pagination tail', async () => {
  const html = await readFile(fixturePath('watchlist-page-1.html'), 'utf8');
  assert.equal(parseMaxPage(html), 6);
});

test('parseMaxPage reads the current page when there is no further link', async () => {
  const html = await readFile(fixturePath('watchlist-page-6.html'), 'utf8');
  assert.equal(parseMaxPage(html), 6);
});

test('parseMaxPage defaults to 1 without pagination', () => {
  assert.equal(parseMaxPage('<html><body><p>no pages</p></body></html>'), 1);
});

test('parseListLabel strips the Letterboxd suffix', async () => {
  const html = await readFile(fixturePath('watchlist-page-1.html'), 'utf8');
  assert.equal(parseListLabel(html), "username’s Watchlist");
});

test('parseListLabel returns null without a title', () => {
  assert.equal(parseListLabel('<html></html>'), null);
});

test('parseOgImage reads the og:image from a film page', async () => {
  const html = await readFile(fixturePath('film-the-captive.html'), 'utf8');
  const image = parseOgImage(html);
  assert.ok(image?.startsWith('https://a.ltrbxd.com/'));
});

test('parseOgImage returns null when absent', () => {
  assert.equal(parseOgImage('<html><body></body></html>'), null);
});