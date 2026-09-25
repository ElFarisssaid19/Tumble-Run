import { OBSTACLE_KINDS, THEMES, type ObstacleKind } from './config';
import { generateCourse, type Course, type CourseSettings } from './course';
import type { StarTimes } from './rating';
import type { Records } from './records';

export interface LevelDef extends CourseSettings<ObstacleKind> {
  id: string;
  name: string;
  /** Chosen by hand: with the settings it fixes the obstacle order, their timing and the coins. */
  seed: number;
  starTimes: StarTimes;
}

/**
 * The hand-made levels, easiest first. Difficulty rises through length, obstacle count, the
 * obstacle mix (each level brings in new kinds) and checkpoint spacing; speeds only rise gently.
 * Slow obstacles are not used as the easy setting: they just make players wait for an opening.
 *
 * New per level: Warm-Up bumpers and railed bridges · Spin Cycle spinners, turntables and open
 * bridges · Crosswind pistons and hammers · Gauntlet ramps and drawbridges · Grand Tumble: all.
 *
 * Star times are measured, not guessed. The marble alone is no guide: it tops out near 17 m/s,
 * so even Grand Tumble's 108 m could be rolled in under 8 s; waiting for the obstacles is what
 * sets the pace. So an autopilot played every level 12 times (play-test, 2026-09-25): it steers
 * through the game's own input, cruises at 5, 6.5 or 8 m/s, reads each obstacle's motion and
 * jumps, brakes or goes, lines up for bridges and takes ramps at speed. Its 25th-percentile time
 * is a good run but not its luckiest one:
 * - three = that time × 1.2 (a person reacts later and steers less precisely than the
 *   autopilot), rounded up to the next half second;
 * - two = 1.5 × three, rounded up: a run with a fall or two, or with long waits.
 * Change a level's layout or speeds and these need measuring again. The comments give each
 * level's distance from spawn to finish line and the autopilot's best / 25th percentile /
 * median times (and falls per run).
 */
export const LEVELS = [
  {
    id: 'warm-up',
    name: 'Warm-Up',
    seed: 1101,
    kinds: ['limbo', 'bumpers', 'sweeper'],
    obstacleCount: 6,
    bridgeKinds: ['railed'],
    bridgeCount: 1,
    speedRange: [0.9, 1],
    checkpointEvery: 3,
    coinCount: 4,
    themes: ['meadow', 'desert'],
    // 39.8 m · autopilot 12.2 / 12.6 / 14.4 s, 0.25 falls
    starTimes: { three: 15_500, two: 23_500 },
  },
  {
    id: 'spin-cycle',
    name: 'Spin Cycle',
    seed: 2202,
    kinds: ['spinner', 'limbo', 'turntable', 'bumpers', 'sweeper'],
    obstacleCount: 9,
    bridgeKinds: ['railed', 'open'],
    bridgeCount: 2,
    speedRange: [0.95, 1.1],
    checkpointEvery: 3,
    coinCount: 6,
    themes: ['meadow', 'desert', 'snow'],
    // 59.8 m · autopilot 18.3 / 22.1 / 23.3 s, 0.75 falls
    starTimes: { three: 27_000, two: 40_500 },
  },
  {
    id: 'crosswind',
    name: 'Crosswind',
    seed: 3303,
    kinds: ['pistons', 'sweeper', 'hammer', 'spinner', 'limbo', 'turntable'],
    obstacleCount: 12,
    bridgeKinds: ['open', 'railed'],
    bridgeCount: 2,
    speedRange: [1, 1.2],
    checkpointEvery: 4,
    coinCount: 7,
    themes: ['desert', 'snow', 'night'],
    // 71.8 m · autopilot 23.1 / 26.6 / 27.7 s, 1.0 falls
    starTimes: { three: 32_000, two: 48_000 },
  },
  {
    id: 'gauntlet',
    name: 'Gauntlet',
    seed: 4404,
    kinds: ['hammer', 'ramp', 'pistons', 'spinner', 'turntable', 'sweeper', 'limbo'],
    obstacleCount: 15,
    bridgeKinds: ['open', 'drawbridge'],
    bridgeCount: 3,
    speedRange: [1.05, 1.3],
    checkpointEvery: 4,
    coinCount: 8,
    themes: ['meadow', 'desert', 'snow', 'night'],
    // 91.8 m · autopilot 29.5 / 33.4 / 42.0 s, 2.3 falls
    starTimes: { three: 40_500, two: 61_000 },
  },
  {
    id: 'grand-tumble',
    name: 'Grand Tumble',
    seed: 5505,
    kinds: ['hammer', 'ramp', 'pistons', 'spinner', 'turntable', 'sweeper', 'limbo', 'bumpers'],
    obstacleCount: 18,
    bridgeKinds: ['drawbridge', 'open', 'railed'],
    bridgeCount: 4,
    speedRange: [1.1, 1.4],
    checkpointEvery: 5,
    coinCount: 10,
    themes: ['meadow', 'desert', 'snow', 'night'],
    // 107.8 m · autopilot 34.3 / 38.1 / 45.9 s, 1.3 falls
    starTimes: { three: 46_000, two: 69_000 },
  },
] as const satisfies readonly LevelDef[];

export type Level = (typeof LEVELS)[number];
export type LevelId = Level['id'];

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

/** 1 for the first level, 2 for the second… (0 if unknown). */
export function levelNumber(id: string): number {
  return LEVELS.findIndex((level) => level.id === id) + 1;
}

export function nextLevel(id: string): Level | undefined {
  const number = levelNumber(id);
  return number === 0 ? undefined : LEVELS[number];
}

/** The first level is always open; every other one opens once the level before it is beaten. */
export function isLevelUnlocked(id: string, records: Records): boolean {
  const index = LEVELS.findIndex((level) => level.id === id);
  if (index <= 0) return index === 0;
  const previous = LEVELS[index - 1];
  return previous !== undefined && records.levels[previous.id] !== undefined;
}

export function levelCourse(level: LevelDef): Course<ObstacleKind> {
  const { seed, kinds, obstacleCount, bridgeKinds, bridgeCount, speedRange } = level;
  const { checkpointEvery, coinCount, themes } = level;
  return generateCourse({
    seed,
    kinds,
    obstacleCount,
    bridgeKinds,
    bridgeCount,
    speedRange,
    checkpointEvery,
    coinCount,
    themes,
  });
}

/**
 * Endless mode: the default generated course (the same generator and rules as the levels) for a
 * seed, with every obstacle and bridge kind. The seed also picks the first scenery theme.
 */
export function endlessCourse(seed: number): Course<ObstacleKind> {
  const first = seed % THEMES.length;
  const themes = [...THEMES.slice(first), ...THEMES.slice(0, first)];
  return generateCourse({ seed, kinds: OBSTACLE_KINDS, themes });
}
