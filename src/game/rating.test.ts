import { describe, expect, it } from 'vitest';
import { ALL_COINS_BONUS, rateRun, timeStars } from './rating';

const TIMES = { three: 10_000, two: 15_000 };

describe('timeStars', () => {
  it('gives 3 stars at or under the 3-star time', () => {
    expect(timeStars(6_000, TIMES)).toBe(3);
    expect(timeStars(10_000, TIMES)).toBe(3);
  });

  it('gives 2 stars between the two thresholds, inclusive of the 2-star time', () => {
    expect(timeStars(10_001, TIMES)).toBe(2);
    expect(timeStars(15_000, TIMES)).toBe(2);
  });

  it('gives 1 star for any slower finish', () => {
    expect(timeStars(15_001, TIMES)).toBe(1);
    expect(timeStars(600_000, TIMES)).toBe(1);
  });
});

describe('rateRun', () => {
  it('is the time rating when some coins were missed', () => {
    expect(rateRun(9_000, TIMES, false)).toBe(3);
    expect(rateRun(12_000, TIMES, false)).toBe(2);
    expect(rateRun(20_000, TIMES, false)).toBe(1);
  });

  it('adds the all-coins bonus', () => {
    expect(ALL_COINS_BONUS).toBe(1);
    expect(rateRun(20_000, TIMES, true)).toBe(2);
    expect(rateRun(12_000, TIMES, true)).toBe(3);
  });

  it('never goes above 3 stars', () => {
    expect(rateRun(9_000, TIMES, true)).toBe(3);
  });
});
