import { describe, expect, it } from 'vitest';
import { BLOCK_SIZE, OBSTACLE_KINDS } from './config';
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

  it('gets harder level by level: longer, with more and faster obstacles', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const [easier, harder] = [LEVELS[i - 1], LEVELS[i]];
      if (!easier || !harder) throw new Error('missing level');
      expect(harder.obstacleCount).toBeGreaterThan(easier.obstacleCount);
      expect(harder.speedRange[0]).toBeGreaterThan(easier.speedRange[0]);
      expect(harder.speedRange[1]).toBeGreaterThan(easier.speedRange[1]);
      expect(levelCourse(harder).length).toBeGreaterThan(levelCourse(easier).length);
    }
  });

  it('gives every level 3 to 5 coins and at least one checkpoint', () => {
    for (const level of LEVELS) {
      const course = levelCourse(level);
      expect(course.coins.length).toBe(level.coinCount);
      expect(course.coins.length).toBeGreaterThanOrEqual(3);
      expect(course.coins.length).toBeLessThanOrEqual(5);
      expect(course.checkpoints.length).toBeGreaterThanOrEqual(1);
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

  it('uses the default generator settings and every obstacle kind', () => {
    const course = endlessCourse(7);
    expect(course).toEqual(generateCourse({ seed: 7, kinds: OBSTACLE_KINDS }));
    const kinds = new Set(
      course.blocks.flatMap((block) => (block.type === 'obstacle' ? [block.obstacle.kind] : [])),
    );
    expect(kinds).toEqual(new Set(OBSTACLE_KINDS));
  });
});
