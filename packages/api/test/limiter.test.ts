import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SlidingWindowLimiter } from '../src/lib/limiter.js';

test('allows up to the window max', () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  assert.equal(limiter.allow('1.2.3.4', 1000), true);
  assert.equal(limiter.allow('1.2.3.4', 2000), true);
  assert.equal(limiter.allow('1.2.3.4', 3000), true);
  assert.equal(limiter.allow('1.2.3.4', 4000), false);
});

test('tracks IPs independently', () => {
  const limiter = new SlidingWindowLimiter(1, 60_000);
  assert.equal(limiter.allow('1.1.1.1', 0), true);
  assert.equal(limiter.allow('1.1.1.1', 1), false);
  assert.equal(limiter.allow('2.2.2.2', 2), true);
});

test('window slides: rejected only within the window', () => {
  const limiter = new SlidingWindowLimiter(2, 100);
  assert.equal(limiter.allow('9.9.9.9', 0), true);
  assert.equal(limiter.allow('9.9.9.9', 50), true);
  assert.equal(limiter.allow('9.9.9.9', 60), false);
  assert.equal(limiter.allow('9.9.9.9', 160), true);
});