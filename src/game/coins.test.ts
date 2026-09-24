import { describe, expect, it } from 'vitest';
import { collectCoin, hasAllCoins } from './coins';
import { generateCourse } from './course';

const KINDS = ['spinner', 'limbo', 'sweeper'] as const;

describe('collectCoin', () => {
  it('adds a new coin without changing the input', () => {
    const before = [0];
    const after = collectCoin(before, 2, 4);
    expect(after).toEqual([0, 2]);
    expect(before).toEqual([0]);
  });

  it('returns the same list for a coin already collected', () => {
    const collected = [1, 3];
    expect(collectCoin(collected, 3, 4)).toBe(collected);
  });

  it.each([-1, 4, 1.5, Number.NaN])('ignores the invalid id %s', (id) => {
    const collected = [0];
    expect(collectCoin(collected, id, 4)).toBe(collected);
  });
});

describe('hasAllCoins', () => {
  it('is true only once every coin is collected', () => {
    expect(hasAllCoins([], 3)).toBe(false);
    expect(hasAllCoins([0, 2], 3)).toBe(false);
    expect(hasAllCoins([2, 0, 1], 3)).toBe(true);
  });

  it('is false on a course without coins (no bonus for nothing)', () => {
    expect(hasAllCoins([], 0)).toBe(false);
  });

  it('tracks a full pickup sequence, duplicates included', () => {
    let collected: readonly number[] = [];
    for (const id of [2, 0, 2, 1, 0, 3]) collected = collectCoin(collected, id, 4);
    expect(collected).toEqual([2, 0, 1, 3]);
    expect(hasAllCoins(collected, 4)).toBe(true);
  });
});

describe('coin placement', () => {
  it('places the requested number of coins, numbered in course order', () => {
    for (const coinCount of [0, 3, 5]) {
      const course = generateCourse({ seed: 11, kinds: KINDS, coinCount });
      expect(course.coins.map((coin) => coin.id)).toEqual([...Array(coinCount).keys()]);
      const blocks = course.coins.map((coin) => coin.blockIndex);
      expect(blocks).toEqual([...blocks].sort((a, b) => a - b));
    }
  });

  it('keeps coins on obstacle or checkpoint blocks, near the racing line', () => {
    for (let seed = 0; seed < 100; seed++) {
      const course = generateCourse({ seed, kinds: KINDS });
      for (const coin of course.coins) {
        const block = course.blocks[coin.blockIndex];
        expect(['obstacle', 'checkpoint']).toContain(block?.type);
        expect(Math.abs(coin.x)).toBeLessThanOrEqual(1.2);
        const offset = Math.abs(coin.z - (block?.z ?? Number.NaN));
        expect(offset).toBeGreaterThanOrEqual(1);
        expect(offset).toBeLessThanOrEqual(1.4);
      }
    }
  });

  it('never puts two coins on the same block', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { coins } = generateCourse({ seed, kinds: KINDS, coinCount: 5 });
      expect(new Set(coins.map((coin) => coin.blockIndex)).size).toBe(coins.length);
    }
  });

  it('caps the coins at one per eligible block', () => {
    const course = generateCourse({ seed: 2, kinds: KINDS, obstacleCount: 2, coinCount: 9 });
    expect(course.coins).toHaveLength(2);
  });

  it('does not change the obstacle layout when the coin count changes', () => {
    const few = generateCourse({ seed: 99, kinds: KINDS, coinCount: 1 });
    const many = generateCourse({ seed: 99, kinds: KINDS, coinCount: 5 });
    expect(many.blocks).toEqual(few.blocks);
  });
});
