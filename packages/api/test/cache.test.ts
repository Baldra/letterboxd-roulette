import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { test } from 'node:test';
import { TtlCache } from '../src/lib/cache.js';

test('caches a value within the TTL', () => {
  const cache = new TtlCache<string>();
  cache.set('a', '1', 60_000);
  assert.equal(cache.get('a'), '1');
});

test('expires lazily after the TTL', async () => {
  const cache = new TtlCache<string>();
  cache.set('a', '1', 20);
  assert.equal(cache.get('a'), '1');
  await sleep(40);
  assert.equal(cache.get('a'), undefined);
});

test('evicts oldest entry beyond the size cap', () => {
  const cache = new TtlCache<number>(2);
  cache.set('a', 1, 60_000);
  cache.set('b', 2, 60_000);
  cache.set('c', 3, 60_000);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.size, 2);
});

test('re-setting a key refreshes its eviction order', () => {
  const cache = new TtlCache<number>(2);
  cache.set('a', 1, 60_000);
  cache.set('b', 2, 60_000);
  cache.set('a', 11, 60_000);
  cache.set('c', 3, 60_000);
  assert.equal(cache.get('a'), 11);
  assert.equal(cache.get('b'), undefined);
});

test('delete removes a key', () => {
  const cache = new TtlCache<number>();
  cache.set('a', 1, 60_000);
  cache.delete('a');
  assert.equal(cache.get('a'), undefined);
});