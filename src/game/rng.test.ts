import { describe, expect, it } from 'vitest';
import { createRng, randomSeed } from './rng';

const take = (seed: number, count: number) => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
};

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take(2026, 50)).toEqual(take(2026, 50));
  });

  it('produces different sequences for different seeds', () => {
    expect(take(1, 10)).not.toEqual(take(2, 10));
  });

  it('stays in [0, 1) and spreads values evenly', () => {
    const values = take(7, 10_000);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('keeps range() and int() within bounds', () => {
    const rng = createRng(99);
    const ints = new Set<number>();
    for (let i = 0; i < 1_000; i++) {
      const float = rng.range(-2, 3);
      expect(float).toBeGreaterThanOrEqual(-2);
      expect(float).toBeLessThan(3);
      ints.add(rng.int(1, 4));
    }
    expect([...ints].sort()).toEqual([1, 2, 3, 4]);
  });

  it('shuffles without losing or mutating items', () => {
    const items = ['a', 'b', 'c', 'd', 'e'] as const;
    const shuffled = createRng(3).shuffle(items);
    expect([...shuffled].sort()).toEqual([...items]);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('treats seeds as unsigned 32-bit integers', () => {
    expect(take(-1, 5)).toEqual(take(2 ** 32 - 1, 5));
  });
});

describe('randomSeed', () => {
  it('returns unsigned 32-bit integers', () => {
    for (let i = 0; i < 100; i++) {
      const seed = randomSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});
