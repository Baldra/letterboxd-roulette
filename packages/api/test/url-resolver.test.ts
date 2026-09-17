import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveQuery } from '../src/lib/url-resolver.js';

test('bare username resolves to the watchlist', () => {
  const r = resolveQuery('username');
  assert.deepEqual(r, {
    owner: 'username',
    listSlug: undefined,
    url: 'https://letterboxd.com/username/watchlist/',
  });
});

test('username/list-slug resolves to the public list', () => {
  const r = resolveQuery('username/oscars-2026');
  assert.ok(r);
  assert.equal(r.owner, 'username');
  assert.equal(r.listSlug, 'oscars-2026');
  assert.equal(r.url, 'https://letterboxd.com/username/list/oscars-2026/');
});

test('rejects empty input', () => {
  assert.equal(resolveQuery(''), null);
  assert.equal(resolveQuery('   '), null);
});

test('rejects more than two segments', () => {
  assert.equal(resolveQuery('a/b/c'), null);
});

test('rejects full URLs', () => {
  assert.equal(resolveQuery('https://letterboxd.com/username/watchlist/'), null);
  assert.equal(resolveQuery('letterboxd.com/username'), null);
});

test('rejects invalid characters', () => {
  assert.equal(resolveQuery('bal.dra'), null);
  assert.equal(resolveQuery('bal$dra'), null);
  assert.equal(resolveQuery('/username'), null);
});

test('rejects empty list slug segment', () => {
  assert.equal(resolveQuery('username/'), null);
});