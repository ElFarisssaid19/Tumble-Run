import { describe, expect, it } from 'vitest';
import { START_SPAWN, spawnPoint } from './checkpoints';
import { SPAWN_OFFSET_Z } from './config';
import { LEVELS, endlessCourse, levelCourse } from './levels';
import { RECORDS_KEY, loadRecords, recordLevelRun, saveRecords, EMPTY_RECORDS } from './records';
import { formatSeed } from './seedCode';
import { createGameStore, type GameStore } from './store';
import { memoryStorage } from './testing';
import { elapsedMs } from './timer';

const [WARM_UP, SPIN_CYCLE] = LEVELS;

/** A store on a level, clock started at t = 0. */
function racing(storage = memoryStorage(), levelId: (typeof LEVELS)[number]['id'] = 'warm-up') {
  const store = createGameStore({ storage });
  store.getState().selectLevel(levelId);
  store.getState().start(0);
  return store;
}

function collectAll(store: GameStore) {
  store.getState().course.coins.forEach((coin) => store.getState().collectCoin(coin.id));
}

describe('game store: menu and course selection', () => {
  it('opens on the menu over the first level, clock at zero', () => {
    const state = createGameStore().getState();
    expect(state.phase).toBe('menu');
    expect(state.mode).toBe('level');
    expect(state.levelId).toBe('warm-up');
    expect(state.seed).toBe(WARM_UP.seed);
    expect(state.course).toEqual(levelCourse(WARM_UP));
    expect(state.records).toEqual(EMPTY_RECORDS);
    expect(elapsedMs(state.timer, 10_000)).toBe(0);
  });

  it('loads saved records', () => {
    const records = recordLevelRun(EMPTY_RECORDS, 'warm-up', 8_000, 3).records;
    const storage = memoryStorage();
    saveRecords(storage, records);
    expect(createGameStore({ storage }).getState().records).toEqual(records);
  });

  it('ignores racing events on the menu', () => {
    const store = createGameStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.getState().start(0);
    store.getState().finish(1_000);
    store.getState().restart();
    store.getState().quit();
    store.getState().fall();
    expect(store.getState().phase).toBe('menu');
    expect(calls).toBe(0);
  });

  it('selects an open level: ready on its course, as a new run', () => {
    const store = createGameStore();
    store.getState().selectLevel('warm-up');
    const state = store.getState();
    expect(state.phase).toBe('ready');
    expect(state.levelId).toBe('warm-up');
    expect(state.run).toBe(1);
  });

  it('refuses a locked level', () => {
    const store = createGameStore();
    store.getState().selectLevel('spin-cycle');
    expect(store.getState().phase).toBe('menu');
    expect(store.getState().levelId).toBe('warm-up');
  });

  it('allows a level unlocked by saved records', () => {
    const storage = memoryStorage();
    saveRecords(storage, recordLevelRun(EMPTY_RECORDS, 'warm-up', 8_000, 3).records);
    const store = createGameStore({ storage });
    store.getState().selectLevel('spin-cycle');
    expect(store.getState().phase).toBe('ready');
    expect(store.getState().seed).toBe(SPIN_CYCLE.seed);
    expect(store.getState().course).toEqual(levelCourse(SPIN_CYCLE));
  });

  it('quits back to the menu and resets the run', () => {
    const store = racing();
    store.getState().collectCoin(0);
    store.getState().quit();
    const state = store.getState();
    expect(state.phase).toBe('menu');
    expect(state.coins).toEqual([]);
    expect(elapsedMs(state.timer, 5_000)).toBe(0);
  });
});

describe('game store: a level from start to finish', () => {
  it('runs menu → select → play → finish and scores the run', () => {
    const storage = memoryStorage();
    const store = createGameStore({ storage });
    store.getState().selectLevel('warm-up');
    store.getState().start(1_000);
    expect(store.getState().phase).toBe('playing');

    const time = WARM_UP.starTimes.two; // a 2-star time
    store.getState().fall();
    store.getState().finish(1_000 + time);

    const { phase, result, records } = store.getState();
    expect(phase).toBe('ended');
    expect(result).toMatchObject({
      timeMs: time,
      falls: 1,
      coins: 0,
      coinTotal: WARM_UP.coinCount,
      allCoins: false,
      stars: 2,
      timeStars: 2,
      previousBestMs: null,
      best: 'first',
      newBest: false,
      unlocked: 'spin-cycle',
    });
    expect(records.levels['warm-up']).toEqual({ bestTimeMs: time, bestStars: 2 });
    // Saved straight away.
    expect(loadRecords(storage)).toEqual(records);
    expect(storage.data.has(RECORDS_KEY)).toBe(true);
  });

  it('flags a new best only when the best time is beaten', () => {
    const storage = memoryStorage();
    const play = (timeMs: number) => {
      const store = createGameStore({ storage });
      store.getState().selectLevel('warm-up');
      store.getState().start(0);
      store.getState().finish(timeMs);
      return store.getState().result;
    };

    expect(play(20_000)).toMatchObject({ best: 'first', newBest: false });
    expect(play(18_000)).toMatchObject({ best: 'improved', newBest: true, previousBestMs: 20_000 });
    expect(play(18_000)).toMatchObject({ best: 'kept', newBest: false, previousBestMs: 18_000 });
    expect(play(25_000)).toMatchObject({ best: 'kept', newBest: false, unlocked: null });
    expect(loadRecords(storage).levels['warm-up']?.bestTimeMs).toBe(18_000);
  });

  it('adds the all-coins bonus to the star rating', () => {
    const store = racing();
    collectAll(store);
    store.getState().finish(WARM_UP.starTimes.two);
    expect(store.getState().result).toMatchObject({
      coins: WARM_UP.coinCount,
      allCoins: true,
      timeStars: 2,
      stars: 3,
    });
    expect(store.getState().records.levels['warm-up']?.bestStars).toBe(3);
  });

  it('starts the clock on the first input only', () => {
    const store = createGameStore();
    store.getState().selectLevel('warm-up');
    store.getState().start(1_000);
    store.getState().start(2_000);
    expect(store.getState().timer.startedAt).toBe(1_000);
    expect(elapsedMs(store.getState().timer, 3_000)).toBe(2_000);
  });

  it('ignores reaching the trophy before the race started', () => {
    const store = createGameStore();
    store.getState().selectLevel('warm-up');
    store.getState().finish(500);
    expect(store.getState().phase).toBe('ready');
    expect(store.getState().result).toBeNull();
  });

  it('ignores input after the finish', () => {
    const store = racing();
    store.getState().finish(5_000);
    store.getState().start(6_000);
    store.getState().finish(9_000);
    store.getState().collectCoin(0);
    expect(store.getState().phase).toBe('ended');
    expect(store.getState().coins).toEqual([]);
    expect(store.getState().result?.timeMs).toBe(5_000);
  });

  it('can go straight on to the next level from the end screen', () => {
    const store = racing();
    store.getState().finish(30_000);
    store.getState().selectLevel('spin-cycle');
    expect(store.getState().phase).toBe('ready');
    expect(store.getState().levelId).toBe('spin-cycle');
    expect(store.getState().result).toBeNull();
  });
});

describe('game store: restart', () => {
  it('replays the same level and course, as a fresh run', () => {
    const store = racing();
    const { course, seed, run } = store.getState();
    store.getState().collectCoin(0);
    store.getState().reachCheckpoint(0);
    store.getState().fall();
    store.getState().finish(9_000);
    store.getState().restart();

    const state = store.getState();
    expect(state.phase).toBe('ready');
    expect(state.levelId).toBe('warm-up');
    expect(state.seed).toBe(seed);
    expect(state.course).toBe(course);
    expect(state.run).toBe(run + 1);
    expect(state.falls).toBe(0);
    expect(state.coins).toEqual([]);
    expect(state.checkpoint).toBeNull();
    expect(state.result).toBeNull();
    expect(elapsedMs(state.timer, 20_000)).toBe(0);
  });

  it('can restart mid-race', () => {
    const store = racing();
    store.getState().restart();
    expect(store.getState().phase).toBe('ready');
    store.getState().start(3_000);
    expect(elapsedMs(store.getState().timer, 4_000)).toBe(1_000);
  });

  it('keeps the Endless seed; only a new Endless run picks another', () => {
    const store = createGameStore();
    store.getState().playEndless(12_345);
    store.getState().start(0);
    store.getState().restart();
    expect(store.getState().seed).toBe(12_345);
    expect(store.getState().course).toEqual(endlessCourse(12_345));

    const seeds = new Set<number>();
    for (let i = 0; i < 5; i++) {
      store.getState().playEndless();
      seeds.add(store.getState().seed);
      expect(store.getState().course).toEqual(endlessCourse(store.getState().seed));
    }
    expect(seeds.size).toBeGreaterThan(1);
  });
});

describe('game store: Endless', () => {
  it('plays the course for a given seed', () => {
    const store = createGameStore();
    store.getState().playEndless(987_654);
    const state = store.getState();
    expect(state.phase).toBe('ready');
    expect(state.mode).toBe('endless');
    expect(state.levelId).toBeNull();
    expect(state.course).toEqual(endlessCourse(987_654));
  });

  it('saves the best time per seed code, without stars', () => {
    const storage = memoryStorage();
    const store = createGameStore({ storage });
    store.getState().playEndless(987_654);
    store.getState().start(0);
    store.getState().finish(40_000);
    expect(store.getState().result).toMatchObject({ stars: null, best: 'first' });

    store.getState().restart();
    store.getState().start(0);
    store.getState().finish(35_000);
    expect(store.getState().result).toMatchObject({ newBest: true, previousBestMs: 40_000 });
    expect(loadRecords(storage).endless).toEqual({ [formatSeed(987_654)]: 35_000 });
  });
});

describe('game store: checkpoints and falls', () => {
  it('respawns at the start until a checkpoint is reached', () => {
    const store = racing();
    store.getState().fall();
    const state = store.getState();
    expect(state.falls).toBe(1);
    expect(spawnPoint(state.course, state.checkpoint)).toEqual(START_SPAWN);
  });

  it('respawns at the furthest checkpoint reached', () => {
    const store = racing(memoryStorage(), 'warm-up');
    const { checkpoints } = store.getState().course;
    expect(checkpoints.length).toBeGreaterThanOrEqual(1);

    store.getState().reachCheckpoint(0);
    store.getState().fall();
    const state = store.getState();
    expect(state.checkpoint).toBe(0);
    expect(spawnPoint(state.course, state.checkpoint).z).toBe(
      (checkpoints[0]?.z ?? Number.NaN) + SPAWN_OFFSET_Z,
    );
  });

  it('never moves the respawn point backwards', () => {
    const storage = memoryStorage();
    saveRecords(
      storage,
      ['warm-up', 'spin-cycle', 'crosswind'].reduce(
        (records, id) => recordLevelRun(records, id, 30_000, 1).records,
        EMPTY_RECORDS,
      ),
    );
    const store = racing(storage, 'gauntlet');
    expect(store.getState().course.checkpoints.length).toBeGreaterThanOrEqual(2);
    store.getState().reachCheckpoint(1);
    store.getState().reachCheckpoint(0);
    expect(store.getState().checkpoint).toBe(1);
  });

  it('changes nothing (and notifies nobody) when a checkpoint is touched again', () => {
    const store = racing();
    store.getState().reachCheckpoint(0);
    let calls = 0;
    store.subscribe(() => calls++);
    store.getState().reachCheckpoint(0);
    store.getState().reachCheckpoint(99);
    expect(calls).toBe(0);
  });

  it('counts falls and checkpoints only while racing', () => {
    const store = createGameStore();
    store.getState().selectLevel('warm-up');
    store.getState().fall();
    store.getState().reachCheckpoint(0);
    expect(store.getState().falls).toBe(0);
    expect(store.getState().checkpoint).toBeNull();
  });

  it('keeps the clock running after a fall', () => {
    const store = racing();
    store.getState().fall();
    expect(store.getState().phase).toBe('playing');
    expect(elapsedMs(store.getState().timer, 4_000)).toBe(4_000);
  });
});

describe('game store: bridges', () => {
  /** A store racing Grand Tumble (every level open), and its course. */
  function racingGrandTumble() {
    const storage = memoryStorage();
    saveRecords(
      storage,
      LEVELS.reduce(
        (records, level) => recordLevelRun(records, level.id, 90_000, 1).records,
        EMPTY_RECORDS,
      ),
    );
    const store = racing(storage, 'grand-tumble');
    return { store, course: store.getState().course };
  }

  it('respawns at the last checkpoint after falling off a bridge', () => {
    const { store, course } = racingGrandTumble();
    // A bridge with at least one checkpoint before it.
    const bridge = course.blocks.find(
      (block) => block.type === 'bridge' && block.index > (course.checkpoints[0]?.blockIndex ?? 0),
    );
    if (!bridge) throw new Error('Grand Tumble should have a bridge after a checkpoint');
    const reached = course.checkpoints.filter((cp) => cp.blockIndex < bridge.index);

    // Roll past each checkpoint up to the bridge, then fall off it.
    reached.forEach((cp) => store.getState().reachCheckpoint(cp.id));
    store.getState().fall();

    const state = store.getState();
    const last = reached.at(-1);
    expect(state.falls).toBe(1);
    expect(state.checkpoint).toBe(last?.id);
    expect(spawnPoint(state.course, state.checkpoint).z).toBe((last?.z ?? NaN) + SPAWN_OFFSET_Z);
    // Behind the bridge, on solid ground.
    expect(spawnPoint(state.course, state.checkpoint).z).toBeGreaterThan(bridge.z);
  });

  it('respawns at the start after falling off a bridge before any checkpoint', () => {
    const storage = memoryStorage();
    const store = racing(storage, 'warm-up');
    const { course } = store.getState();
    const bridge = course.blocks.find((block) => block.type === 'bridge');
    const firstCheckpoint = course.checkpoints[0];
    if (!bridge || !firstCheckpoint) throw new Error('Warm-Up has a bridge and checkpoints');
    expect(bridge.index).toBeLessThan(firstCheckpoint.blockIndex);

    store.getState().fall();
    expect(spawnPoint(course, store.getState().checkpoint)).toEqual(START_SPAWN);
  });
});

describe('game store: coins', () => {
  it('collects each coin once', () => {
    const store = racing();
    store.getState().collectCoin(1);
    store.getState().collectCoin(1);
    store.getState().collectCoin(0);
    store.getState().collectCoin(-3);
    store.getState().collectCoin(99);
    expect(store.getState().coins).toEqual([1, 0]);
  });

  it('does not count coins touched before the race starts', () => {
    const store = createGameStore();
    store.getState().selectLevel('warm-up');
    store.getState().collectCoin(0);
    expect(store.getState().coins).toEqual([]);
  });
});
