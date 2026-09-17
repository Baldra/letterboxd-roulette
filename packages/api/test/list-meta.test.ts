import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFixture } from './helpers.js';
import { detectListState } from '../src/lib/list-meta.js';

test('detects a real not-found user page', async () => {
  const html = await readFixture('not-found.html');
  const meta = detectListState(html, 404);
  assert.equal(meta.state, 'not_found');
});

test('detects not-found from a 404 status alone', async () => {
  const html = await readFixture('not-found.html');
  const meta = detectListState(html, 200);
  assert.equal(meta.state, 'not_found');
});

test('detects a private list from the page title', () => {
  const html = '<html><head><title>Private &bull; Letterboxd</title></head><body></body></html>';
  assert.equal(detectListState(html, 200).state, 'private');
});

test('detects a private list from a message', () => {
  const html = '<html><body><h1>This list is private</h1></body></html>';
  assert.equal(detectListState(html, 200).state, 'private');
});

test('detects an empty list when no films parse', () => {
  const html = '<html><head><title>username’s Watchlist &bull; Letterboxd</title></head><body><p>no films yet</p></body></html>';
  assert.equal(detectListState(html, 200).state, 'empty');
});

test('detects a Cloudflare challenge', () => {
  const html = '<html><body>Just a moment...<div class="cf-wrapper"></div></body></html>';
  assert.equal(detectListState(html, 200).state, 'challenged');
});

test('returns ok for a real populated list page', async () => {
  const html = await readFixture('watchlist-page-1.html');
  assert.equal(detectListState(html, 200).state, 'ok');
});