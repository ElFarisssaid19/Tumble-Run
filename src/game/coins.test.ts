import { describe, expect, it } from 'vitest';
import { collectCoin, hasAllCoins } from './coins';
import { generateCourse } from './course';

const KINDS = [
  'spinner',
  'limbo',
  'sweeper',
  'bumpers',
  'turntable',
  'pistons',
  'hammer',
  'ramp',
] as const;
/** Obstacles that fill the middle of their block: their coins sit at the block's edge. */
const EDGE_KINDS: readonly string[] = ['bumpers', 'pistons', 'turntable'];

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

  it('keeps coins on the racing line, clear of each obstacle', () => {
    for (let seed = 0; seed < 150; seed++) {
      const course = generateCourse({ seed, kinds: KINDS, coinCount: 12 });
      for (const coin of course.coins) {
        const block = course.blocks[coin.blockIndex];
        if (!block) throw new Error('coin on a missing block');
        const offset = Math.abs(coin.z - block.z);
        expect(['obstacle', 'checkpoint', 'bridge']).toContain(block.type);
        if (block.type === 'bridge') {
          // On the middle of the deck.
          expect(coin.x).toBe(0);
          expect(offset).toBeGreaterThanOrEqual(0.6);
          expect(offset).toBeLessThanOrEqual(1.4);
        } else if (block.type === 'obstacle' && EDGE_KINDS.includes(block.obstacle.kind)) {
          expect(offset).toBeGreaterThanOrEqual(1.55);
          expect(offset).toBeLessThanOrEqual(1.85);
        } else {
          expect(Math.abs(coin.x)).toBeLessThanOrEqual(1.2);
          expect(offset).toBeGreaterThanOrEqual(1);
          expect(offset).toBeLessThanOrEqual(1.4);
        }
      }
    }
  });

  it("never puts a coin over a ramp's gap", () => {
    for (let seed = 0; seed < 150; seed++) {
      const course = generateCourse({ seed, kinds: KINDS, coinCount: 20 });
      for (const coin of course.coins) {
        const block = course.blocks[coin.blockIndex];
        expect(block?.type === 'obstacle' && block.obstacle.kind === 'ramp').toBe(false);
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
    const course = generateCourse({
      seed: 2,
      kinds: ['limbo', 'spinner'],
      obstacleCount: 2,
      bridgeCount: 0,
      coinCount: 9,
    });
    expect(course.coins).toHaveLength(2);
  });

  it('does not change the obstacle layout when the coin count changes', () => {
    const few = generateCourse({ seed: 99, kinds: KINDS, coinCount: 1 });
    const many = generateCourse({ seed: 99, kinds: KINDS, coinCount: 5 });
    expect(many.blocks).toEqual(few.blocks);
  });
});
