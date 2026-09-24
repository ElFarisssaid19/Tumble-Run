import { createStore } from 'zustand/vanilla';
import { canHandle, nextPhase, type Phase } from './phase';
import { randomSeed } from './rng';
import { IDLE_TIMER, startTimer, stopTimer, type Timer } from './timer';

export interface GameState {
  phase: Phase;
  timer: Timer;
  /** Seed of the current course; every restart draws a new one. */
  seed: number;
  /** Attempt counter, bumped on every restart so the world knows to reset. */
  run: number;
  /** Times the marble fell off the course during this run. */
  falls: number;

  /** First input of a run: the clock starts. Only valid while ready. */
  start: (now: number) => void;
  /** The marble reached the trophy: the clock stops. Only valid while playing. */
  finish: (now: number) => void;
  /** The marble fell off and was sent back to the start (the clock keeps running). */
  fall: () => void;
  /** Back to the start line on a freshly generated course. */
  restart: (seed?: number) => void;
}

export type GameStore = ReturnType<typeof createGameStore>;

export function createGameStore(initialSeed: number = randomSeed()) {
  return createStore<GameState>()((set) => ({
    phase: 'ready',
    timer: IDLE_TIMER,
    seed: initialSeed,
    run: 0,
    falls: 0,

    start: (now) =>
      set((state) =>
        canHandle(state.phase, 'start')
          ? { phase: nextPhase(state.phase, 'start'), timer: startTimer(state.timer, now) }
          : state,
      ),

    finish: (now) =>
      set((state) =>
        canHandle(state.phase, 'finish')
          ? { phase: nextPhase(state.phase, 'finish'), timer: stopTimer(state.timer, now) }
          : state,
      ),

    fall: () => set((state) => (state.phase === 'playing' ? { falls: state.falls + 1 } : state)),

    restart: (seed = randomSeed()) =>
      set((state) => ({
        phase: nextPhase(state.phase, 'restart'),
        timer: IDLE_TIMER,
        seed,
        run: state.run + 1,
        falls: 0,
      })),
  }));
}

/** The game's single store. React components read it through `useGame` (src/hooks). */
export const gameStore = createGameStore();
