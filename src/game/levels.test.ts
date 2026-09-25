import { describe, expect, it } from 'vitest';
import { BLOCK_SIZE, BRIDGE_KINDS, OBSTACLE_KINDS, THEMES } from './config';
import { generateCourse } from './course';
import {
  LEVELS,
  endlessCourse,
  getLevel,
  isLevelUnlocked,
  levelCourse,
  levelNumber,
  nextLevel,
} from './levels';
import { EMPTY_RECORDS, recordLevelRun, type Records } from './records';
import { formatSeed, parseSeed } from './seedCode';

/** Records in which the given levels have been beaten once. */
function beaten(...ids: string[]): Records {
  return ids.reduce((records, id) => recordLevelRun(records, id, 30_000, 1).records, EMPTY_RECORDS);
}

describe('LEVELS', () => {
  it('has five levels with unique ids', () => {
    expect(LEVELS).toHaveLength(5);
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(5);
  });

  it('gets harder level by level: longer, more obstacles and bridges, sparser checkpoints', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const [easier, harder] = [LEVELS[i - 1], LEVELS[i]];
      if (!easier || !harder) throw new Error('missing level');
      expect(harder.obstacleCount).toBeGreaterThan(easier.obstacleCount);
      expect(harder.bridgeCount).toBeGreaterThanOrEqual(easier.bridgeCount);
      expect(harder.checkpointEvery).toBeGreaterThanOrEqual(easier.checkpointEvery);
      expect(levelCourse(harder).length).toBeGreaterThan(levelCourse(easier).length);
    }
  });

  it('raises obstacle speeds only gently, and never uses slow obstacles as the easy setting', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const [min, max] = LEVELS[i]?.speedRange ?? [0, 0];
      // Slow obstacles only make players wait for an opening.
      expect(min).toBeGreaterThanOrEqual(0.9);
      expect(max).toBeLessThanOrEqual(1.4);
      const previous = LEVELS[i - 1]?.speedRange;
      if (previous) {
        expect(min).toBeGreaterThan(previous[0]);
        expect(min - previous[0]).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it('is about twice as long as before, with Warm-Up still short for a first try', () => {
    // Phase 2 lengths (m): Warm-Up, Spin Cycle, Crosswind, Gauntlet, Grand Tumble.
    const before = [28, 32, 36, 48, 56];
    const lengths = LEVELS.map((level) => levelCourse(level).length);
    expect(lengths).toEqual([44, 64, 76, 96, 112]);
    expect(lengths[0]).toBeLessThanOrEqual(48);
    lengths.slice(1).forEach((length, i) => {
      expect(length / (before[i + 1] ?? 1)).toBeGreaterThanOrEqual(1.9);
    });
  });

  it('brings in new obstacle and bridge kinds a level or two at a time', () => {
    const seen = new Set<string>();
    const news = LEVELS.map((level) => {
      const kinds = [...level.kinds, ...level.bridgeKinds];
      const fresh = kinds.filter((kind) => !seen.has(kind));
      kinds.forEach((kind) => seen.add(kind));
      return fresh;
    });
    // Warm-Up starts with a few; each next level adds one to three; the last adds nothing new.
    expect(news[0]?.length).toBeLessThanOrEqual(4);
    news.slice(1, -1).forEach((fresh) => {
      expect(fresh.length).toBeGreaterThanOrEqual(1);
      expect(fresh.length).toBeLessThanOrEqual(3);
    });
    const finale = LEVELS.at(-1);
    expect(new Set(finale?.kinds)).toEqual(new Set(OBSTACLE_KINDS));
    expect(new Set(finale?.bridgeKinds)).toEqual(new Set(BRIDGE_KINDS));
  });

  it('scales coins and checkpoints with the length', () => {
    for (const level of LEVELS) {
      const course = levelCourse(level);
      expect(course.coins.length).toBe(level.coinCount);
      // About one coin every 11 m, and a checkpoint at least every ~30 m.
      const perHundred = (course.coins.length / course.length) * 100;
      expect(perHundred).toBeGreaterThanOrEqual(8);
      expect(perHundred).toBeLessThanOrEqual(11);
      expect(course.checkpoints.length).toBeGreaterThanOrEqual(2);
      expect(course.length / (course.checkpoints.length + 1)).toBeLessThanOrEqual(30);
    }
  });

  it('sends every level through two or more scenery zones', () => {
    for (const level of LEVELS) {
      const { zones } = levelCourse(level);
      expect(zones.map((zone) => zone.theme)).toEqual(level.themes);
      expect(zones.length).toBeGreaterThanOrEqual(2);
    }
    expect(LEVELS.at(-1)?.themes).toEqual(THEMES);
  });

  it('asks for more time for 3 stars level by level, as the levels get harder', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const [easier, harder] = [LEVELS[i - 1], LEVELS[i]];
      expect(harder?.starTimes.three).toBeGreaterThan(easier?.starTimes.three ?? Infinity);
    }
  });

  it('asks for 3 stars faster than 2, with the 2-star time 1.5× the 3-star one', () => {
    for (const { starTimes } of LEVELS) {
      expect(starTimes.three).toBeGreaterThan(0);
      expect(starTimes.two).toBe(Math.ceil((starTimes.three * 1.5) / 500) * 500);
    }
  });

  it('never asks for less than the marble could roll the course in with no obstacles', () => {
    // Upper bound on the marble's speed (it tops out near 17 m/s on open track).
    const MAX_SPEED = 20;
    for (const level of LEVELS) {
      const distance = levelCourse(level).length - BLOCK_SIZE;
      expect(level.starTimes.three / 1000).toBeGreaterThan(distance / MAX_SPEED);
    }
  });
});

describe('level lookup', () => {
  it('finds levels by id, with their number and successor', () => {
    expect(getLevel('crosswind')?.name).toBe('Crosswind');
    expect(getLevel('nope')).toBeUndefined();
    expect(levelNumber('warm-up')).toBe(1);
    expect(levelNumber('grand-tumble')).toBe(5);
    expect(levelNumber('nope')).toBe(0);
    expect(nextLevel('warm-up')?.id).toBe('spin-cycle');
    expect(nextLevel('grand-tumble')).toBeUndefined();
    expect(nextLevel('nope')).toBeUndefined();
  });
});

describe('isLevelUnlocked', () => {
  it('always opens the first level', () => {
    expect(isLevelUnlocked('warm-up', EMPTY_RECORDS)).toBe(true);
  });

  it('locks every other level on a fresh save', () => {
    for (const level of LEVELS.slice(1)) {
      expect(isLevelUnlocked(level.id, EMPTY_RECORDS)).toBe(false);
    }
  });

  it('opens a level once the one before it has been beaten', () => {
    const records = beaten('warm-up');
    expect(isLevelUnlocked('spin-cycle', records)).toBe(true);
    expect(isLevelUnlocked('crosswind', records)).toBe(false);
  });

  it('only looks at the level right before', () => {
    // Beating level 3 (say, from an older save) opens level 4 even with level 2 unbeaten.
    const records = beaten('crosswind');
    expect(isLevelUnlocked('gauntlet', records)).toBe(true);
    expect(isLevelUnlocked('crosswind', records)).toBe(false);
  });

  it('opens everything once all levels are beaten', () => {
    const records = beaten(...LEVELS.map((level) => level.id));
    expect(LEVELS.every((level) => isLevelUnlocked(level.id, records))).toBe(true);
  });

  it('keeps unknown levels locked', () => {
    expect(isLevelUnlocked('secret', beaten(...LEVELS.map((level) => level.id)))).toBe(false);
  });
});

describe('levelCourse', () => {
  it('builds the same course every time for a level', () => {
    for (const level of LEVELS) {
      expect(levelCourse(level)).toEqual(levelCourse(level));
    }
  });

  it('builds a different course for each level, from its own obstacle kinds', () => {
    const layouts = LEVELS.map((level) => JSON.stringify(levelCourse(level).blocks));
    expect(new Set(layouts).size).toBe(LEVELS.length);

    for (const level of LEVELS) {
      for (const block of levelCourse(level).blocks) {
        if (block.type !== 'obstacle') continue;
        expect(level.kinds).toContain(block.obstacle.kind);
        expect(block.obstacle.speed).toBeGreaterThanOrEqual(level.speedRange[0]);
        expect(block.obstacle.speed).toBeLessThan(level.speedRange[1]);
      }
    }
  });
});

describe('endlessCourse', () => {
  it('is fully determined by the seed', () => {
    for (const seed of [0, 1, 42, 2_147_483_647, 4_294_967_295]) {
      expect(endlessCourse(seed)).toEqual(endlessCourse(seed));
    }
  });

  it('replays the same course from the seed code shown on screen', () => {
    const seed = 3_141_592_653;
    const replayed = parseSeed(formatSeed(seed));
    expect(replayed).toBe(seed);
    expect(endlessCourse(replayed ?? 0)).toEqual(endlessCourse(seed));
  });

  it('varies from seed to seed', () => {
    const layouts = new Set(
      Array.from({ length: 30 }, (_, seed) => JSON.stringify(endlessCourse(seed).blocks)),
    );
    expect(layouts.size).toBe(30);
  });

  it('uses the default generator settings, every obstacle kind and all four zones', () => {
    const course = endlessCourse(7);
    expect(course).toEqual(
      generateCourse({ seed: 7, kinds: OBSTACLE_KINDS, themes: course.zones.map((z) => z.theme) }),
    );
    const kinds = new Set(
      course.blocks.flatMap((block) => (block.type === 'obstacle' ? [block.obstacle.kind] : [])),
    );
    expect(kinds).toEqual(new Set(OBSTACLE_KINDS));
    expect(new Set(course.zones.map((zone) => zone.theme))).toEqual(new Set(THEMES));
  });

  it('lets the seed pick the first zone, then goes round the themes in order', () => {
    for (let seed = 0; seed < 8; seed++) {
      const themes = endlessCourse(seed).zones.map((zone) => zone.theme);
      expect(themes[0]).toBe(THEMES[seed % THEMES.length]);
      themes.slice(1).forEach((theme, i) => {
        const previous = THEMES.indexOf(themes[i] ?? 'meadow');
        expect(theme).toBe(THEMES[(previous + 1) % THEMES.length]);
      });
    }
  });
});
