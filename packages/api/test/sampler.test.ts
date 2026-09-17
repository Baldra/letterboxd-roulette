import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pick } from '../src/lib/sampler.js';

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('pick draws uniformly across pages and slots', () => {
  const rng = lcg(42);
  const pageCount = 6;
  const remainder = 20;
  const n = 200_000;
  const perPage = new Array<number>(pageCount).fill(0);
  const perSlot = new Array<number>(28).fill(0);

  for (let i = 0; i < n; i++) {
    const { page, slot } = pick(pageCount, remainder, rng);
    assert.ok(page >= 1 && page <= pageCount);
    assert.ok(slot >= 1 && slot <= 28);
    perPage[page - 1] = (perPage[page - 1] ?? 0) + 1;
    perSlot[slot - 1] = (perSlot[slot - 1] ?? 0) + 1;
  }

  // Full pages each hold 28/160 of the mass; the short last page holds 20/160.
  const fullProb = 28 / 160;
  const lastProb = 20 / 160;
  for (let p = 0; p < pageCount; p++) {
    const expected = n * (p === pageCount - 1 ? lastProb : fullProb);
    const sigma = Math.sqrt(n * (p === pageCount - 1 ? lastProb : fullProb) * (1 - (p === pageCount - 1 ? lastProb : fullProb)));
    assert.ok(
      Math.abs((perPage[p] ?? 0) - expected) < 4 * sigma,
      `page ${p + 1}: got ${perPage[p]}, expected ~${expected.toFixed(0)}`,
    );
  }

  // Slots are essentially uniform (28-way split of 160).
  const slotExpected = n / 160;
  for (let s = 0; s < 28; s++) {
    assert.ok((perSlot[s] ?? 0) > slotExpected * 0.7, `slot ${s + 1} under-drawn`);
  }
});

test('empty last page (exact multiple) never selects the phantom page', () => {
  const rng = lcg(7);
  for (let i = 0; i < 50_000; i++) {
    const { page, slot } = pick(6, 0, rng);
    assert.ok(page >= 1 && page <= 5, 'phantom page 6 must never be selected');
    assert.ok(slot >= 1 && slot <= 28);
  }
});

test('single-page lists pick within the observed count', () => {
  const rng = lcg(3);
  for (let i = 0; i < 1_000; i++) {
    const { page, slot } = pick(1, 9, rng);
    assert.equal(page, 1);
    assert.ok(slot >= 1 && slot <= 9);
  }
});