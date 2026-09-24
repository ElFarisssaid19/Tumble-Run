import { createStore } from 'zustand/vanilla';
import { advanceCheckpoint } from './checkpoints';
import { collectCoin as addCoin, hasAllCoins } from './coins';
import type { ObstacleKind } from './config';
import type { Course } from './course';
import {
  LEVELS,
  endlessCourse,
  getLevel,
  isLevelUnlocked,
  levelCourse,
  nextLevel,
  type LevelId,
} from './levels';
import { canHandle, nextPhase, type Phase } from './phase';
import { rateRun, timeStars, type Stars } from './rating';
import {
  browserStorage,
  loadRecords,
  recordEndlessRun,
  recordLevelRun,
  saveRecords,
  type BestOutcome,
  type KeyValueStorage,
  type Records,
} from './records';
import { randomSeed } from './rng';
import { formatSeed } from './seedCode';
import { IDLE_TIMER, finalTimeMs, startTimer, stopTimer, type Timer } from './timer';

export type Mode = 'level' | 'endless';

/** How a finished run went, and how it compares with the best before it. */
export interface RunResult {
  timeMs: number;
  falls: number;
  coins: number;
  coinTotal: number;
  allCoins: boolean;
  /** Levels only: the rating, and the part of it earned by the time alone (the rest is the coin bonus). */
  stars: Stars | null;
  timeStars: Stars | null;
  /** The best time before this run, or null if this was the first finish. */
  previousBestMs: number | null;
  best: BestOutcome;
  /** The run beat the previous best time. */
  newBest: boolean;
  /** The level this run opened (by clearing the one before it for the first time). */
  unlocked: LevelId | null;
}

export interface GameState {
  phase: Phase;
  mode: Mode;
  /** The level being played, or null in Endless. */
  levelId: LevelId | null;
  /** Seed of the current course: the level's own, or the Endless one. */
  seed: number;
  course: Course<ObstacleKind>;
  timer: Timer;
  /** Attempt counter, bumped whenever a run begins so the world knows to reset. */
  run: number;
  /** Times the marble fell off the course during this run. */
  falls: number;
  /** Furthest checkpoint reached this run; null respawns at the start. */
  checkpoint: number | null;
  /** Ids of the coins collected this run. */
  coins: readonly number[];
  /** Set when the trophy is reached, cleared when the next run begins. */
  result: RunResult | null;
  /** Personal bests, loaded from storage and saved after every finish. */
  records: Records;

  /** Plays a level from its start. Locked levels are ignored. */
  selectLevel: (id: LevelId) => void;
  /** Plays the Endless course for `seed` (a fresh random one by default). */
  playEndless: (seed?: number) => void;
  /** First input of a run: the clock starts. Only valid while ready. */
  start: (now: number) => void;
  /** The marble reached the trophy: the clock stops and the run is scored. Only valid while playing. */
  finish: (now: number) => void;
  /** The marble fell off and was sent back to the last checkpoint (the clock keeps running). */
  fall: () => void;
  reachCheckpoint: (id: number) => void;
  collectCoin: (id: number) => void;
  /** Replays the same course (same level or seed) from the start. */
  restart: () => void;
  /** Back to the level select screen. */
  quit: () => void;
}

export interface GameStoreOptions {
  /** Where records are kept (localStorage in the browser). Without it they last one session. */
  storage?: KeyValueStorage | null;
}

type RunState = Pick<GameState, 'timer' | 'falls' | 'checkpoint' | 'coins' | 'result'>;

const FRESH_RUN: RunState = {
  timer: IDLE_TIMER,
  falls: 0,
  checkpoint: null,
  coins: [],
  result: null,
};

export type GameStore = ReturnType<typeof createGameStore>;

export function createGameStore({ storage = null }: GameStoreOptions = {}) {
  const [firstLevel] = LEVELS;

  return createStore<GameState>()((set, get) => ({
    // The menu opens over the first level's course.
    phase: 'menu',
    mode: 'level',
    levelId: firstLevel.id,
    seed: firstLevel.seed,
    course: levelCourse(firstLevel),
    run: 0,
    ...FRESH_RUN,
    records: loadRecords(storage),

    selectLevel: (id) =>
      set((state) => {
        const level = getLevel(id);
        if (!level || !canHandle(state.phase, 'select') || !isLevelUnlocked(id, state.records)) {
          return state;
        }
        return {
          phase: nextPhase(state.phase, 'select'),
          mode: 'level',
          levelId: level.id,
          seed: level.seed,
          course: levelCourse(level),
          run: state.run + 1,
          ...FRESH_RUN,
        };
      }),

    playEndless: (seed = randomSeed()) =>
      set((state) =>
        canHandle(state.phase, 'select')
          ? {
              phase: nextPhase(state.phase, 'select'),
              mode: 'endless',
              levelId: null,
              seed: seed >>> 0,
              course: endlessCourse(seed >>> 0),
              run: state.run + 1,
              ...FRESH_RUN,
            }
          : state,
      ),

    start: (now) =>
      set((state) =>
        canHandle(state.phase, 'start')
          ? { phase: nextPhase(state.phase, 'start'), timer: startTimer(state.timer, now) }
          : state,
      ),

    finish: (now) => {
      const state = get();
      if (!canHandle(state.phase, 'finish')) return;
      const timer = stopTimer(state.timer, now);
      const timeMs = finalTimeMs(timer);
      if (timeMs === null) return;

      const { result, records } = scoreRun(state, timeMs);
      saveRecords(storage, records);
      set({ phase: nextPhase(state.phase, 'finish'), timer, result, records });
    },

    fall: () => set((state) => (state.phase === 'playing' ? { falls: state.falls + 1 } : state)),

    reachCheckpoint: (id) =>
      set((state) => {
        if (state.phase !== 'playing' || id >= state.course.checkpoints.length) return state;
        const checkpoint = advanceCheckpoint(state.checkpoint, id);
        return checkpoint === state.checkpoint ? state : { checkpoint };
      }),

    collectCoin: (id) =>
      set((state) => {
        if (state.phase !== 'playing') return state;
        const coins = addCoin(state.coins, id, state.course.coins.length);
        return coins === state.coins ? state : { coins };
      }),

    restart: () =>
      set((state) =>
        canHandle(state.phase, 'restart')
          ? { phase: nextPhase(state.phase, 'restart'), run: state.run + 1, ...FRESH_RUN }
          : state,
      ),

    quit: () =>
      set((state) =>
        canHandle(state.phase, 'quit')
          ? { phase: nextPhase(state.phase, 'quit'), run: state.run + 1, ...FRESH_RUN }
          : state,
      ),
  }));
}

/** Rates a finished run and folds it into the records. */
function scoreRun(state: GameState, timeMs: number): { result: RunResult; records: Records } {
  const coinTotal = state.course.coins.length;
  const allCoins = hasAllCoins(state.coins, coinTotal);
  const run = { timeMs, falls: state.falls, coins: state.coins.length, coinTotal, allCoins };
  const level = state.levelId === null ? undefined : getLevel(state.levelId);

  if (state.mode === 'level' && level) {
    const stars = rateRun(timeMs, level.starTimes, allCoins);
    const update = recordLevelRun(state.records, level.id, timeMs, stars);
    const next = nextLevel(level.id);
    const opened =
      next !== undefined &&
      !isLevelUnlocked(next.id, state.records) &&
      isLevelUnlocked(next.id, update.records);
    return {
      records: update.records,
      result: {
        ...run,
        stars,
        timeStars: timeStars(timeMs, level.starTimes),
        previousBestMs: update.previous?.bestTimeMs ?? null,
        best: update.time,
        newBest: update.time === 'improved',
        unlocked: opened ? next.id : null,
      },
    };
  }

  const update = recordEndlessRun(state.records, formatSeed(state.seed), timeMs);
  return {
    records: update.records,
    result: {
      ...run,
      stars: null,
      timeStars: null,
      previousBestMs: update.previousMs ?? null,
      best: update.time,
      newBest: update.time === 'improved',
      unlocked: null,
    },
  };
}

/** The game's single store. React components read it through `useGame` (src/hooks). */
export const gameStore = createGameStore({ storage: browserStorage() });
