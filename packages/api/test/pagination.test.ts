import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeFilmCount, PAGE_SIZE } from '../src/lib/pagination.js';

test('pageSize constant is 28', () => {
  assert.equal(PAGE_SIZE, 28);
});

test('total count from pages and remainder', () => {
  assert.equal(computeFilmCount(6, 20), 160);
  assert.equal(computeFilmCount(1, 7), 7);
  assert.equal(computeFilmCount(4, 28), 112);
});

test('empty last page means an exact multiple of page size', () => {
  // Pagination advertises 6 pages but the last page is empty, so the true
  // total is exactly 5 full pages = 140.
  assert.equal(computeFilmCount(6, 0), 140);
  assert.equal(computeFilmCount(5, 0), 112);
});