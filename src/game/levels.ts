import { OBSTACLE_KINDS, type ObstacleKind } from './config';
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
 * The hand-made levels, easiest first. Difficulty grows with the length, the obstacle mix and
 * the obstacle speeds; later levels also space their checkpoints further apart.
 *
 * Star times are measured, not guessed. The marble alone is no guide: it tops out near 17 m/s,
 * so even the 51.8 m Grand Tumble could be rolled in about 4.5 s. Waiting for the obstacles is
 * what sets the pace. So an autopilot played every level 12 times (play-test, 2026-09-24): it
 * steers through the game's own input, cruises at 5, 6.5 or 8 m/s, reads each obstacle's motion
 * and jumps, brakes or goes. Its 25th-percentile time is a good run but not its luckiest one:
 * - three = that time × 1.2 (a person reacts later and steers less precisely than the
 *   autopilot), rounded up to the next half second. The autopilot's own median run makes
 *   3 stars on four of the five levels.
 * - two = 1.5 × three, rounded up: a run with a fall or two, or with long waits.
 * Change a level's layout or speeds and these need measuring again. The comments give each
 * level's distance from spawn to finish line and the autopilot's best / 25th percentile /
 * median times.
 */
export const LEVELS = [
  {
    id: 'warm-up',
    name: 'Warm-Up',
    seed: 1101,
    kinds: ['limbo', 'sweeper'],
    obstacleCount: 4,
    speedRange: [0.6, 0.8],
    checkpointEvery: 2,
    coinCount: 3,
    // 23.8 m · autopilot 7.9 / 11.0 / 12.6 s
    starTimes: { three: 13_500, two: 20_500 },
  },
  {
    id: 'spin-cycle',
    name: 'Spin Cycle',
    seed: 2202,
    kinds: ['spinner', 'limbo'],
    obstacleCount: 5,
    speedRange: [0.7, 0.95],
    checkpointEvery: 3,
    coinCount: 3,
    // 27.8 m · autopilot 6.9 / 10.2 / 11.0 s
    starTimes: { three: 12_500, two: 19_000 },
  },
  {
    id: 'crosswind',
    name: 'Crosswind',
    seed: 3303,
    kinds: ['spinner', 'limbo', 'sweeper'],
    obstacleCount: 6,
    speedRange: [0.8, 1.1],
    checkpointEvery: 3,
    coinCount: 4,
    // 31.8 m · autopilot 11.4 / 13.0 / 14.5 s
    starTimes: { three: 16_000, two: 24_000 },
  },
  {
    id: 'gauntlet',
    name: 'Gauntlet',
    seed: 4404,
    kinds: ['spinner', 'limbo', 'sweeper'],
    obstacleCount: 8,
    speedRange: [0.95, 1.3],
    checkpointEvery: 3,
    coinCount: 4,
    // 43.8 m · autopilot 17.6 / 18.5 / 20.5 s
    starTimes: { three: 22_500, two: 34_000 },
  },
  {
    id: 'grand-tumble',
    name: 'Grand Tumble',
    seed: 5505,
    kinds: ['spinner', 'limbo', 'sweeper'],
    obstacleCount: 10,
    speedRange: [1.1, 1.55],
    checkpointEvery: 4,
    coinCount: 5,
    // 51.8 m · autopilot 16.3 / 19.3 / 23.8 s
    starTimes: { three: 23_500, two: 35_500 },
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
  const { seed, kinds, obstacleCount, speedRange, checkpointEvery, coinCount } = level;
  return generateCourse({ seed, kinds, obstacleCount, speedRange, checkpointEvery, coinCount });
}

/** Endless mode: the default generated course (the same generator as the levels) for a seed. */
export function endlessCourse(seed: number): Course<ObstacleKind> {
  return generateCourse({ seed, kinds: OBSTACLE_KINDS });
}
