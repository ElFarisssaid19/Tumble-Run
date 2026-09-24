import { describe, expect, it } from 'vitest';
import { createGameStore } from './store';
import { elapsedMs } from './timer';

describe('game store', () => {
  it('starts ready, with the clock at zero', () => {
    const store = createGameStore(42);
    const state = store.getState();
    expect(state.phase).toBe('ready');
    expect(state.seed).toBe(42);
    expect(state.falls).toBe(0);
    expect(elapsedMs(state.timer, 10_000)).toBe(0);
  });

  it('starts the clock on the first input', () => {
    const store = createGameStore(1);
    store.getState().start(1_000);
    const state = store.getState();
    expect(state.phase).toBe('playing');
    expect(elapsedMs(state.timer, 3_000)).toBe(2_000);
  });

  it('does not restart the clock on later inputs', () => {
    const store = createGameStore(1);
    store.getState().start(1_000);
    store.getState().start(2_000);
    expect(store.getState().timer.startedAt).toBe(1_000);
  });

  it('stops the clock at the trophy', () => {
    const store = createGameStore(1);
    store.getState().start(1_000);
    store.getState().finish(13_370);
    const state = store.getState();
    expect(state.phase).toBe('ended');
    expect(elapsedMs(state.timer, 50_000)).toBe(12_370);
  });

  it('ignores reaching the trophy before the race started', () => {
    const store = createGameStore(1);
    store.getState().finish(500);
    expect(store.getState().phase).toBe('ready');
    expect(store.getState().timer.stoppedAt).toBeNull();
  });

  it('ignores input after the finish', () => {
    const store = createGameStore(1);
    store.getState().start(0);
    store.getState().finish(5_000);
    store.getState().start(6_000);
    store.getState().finish(9_000);
    const state = store.getState();
    expect(state.phase).toBe('ended');
    expect(elapsedMs(state.timer, 10_000)).toBe(5_000);
  });

  it('counts falls only while racing', () => {
    const store = createGameStore(1);
    store.getState().fall();
    expect(store.getState().falls).toBe(0);
    store.getState().start(0);
    store.getState().fall();
    store.getState().fall();
    expect(store.getState().falls).toBe(2);
    store.getState().finish(1_000);
    store.getState().fall();
    expect(store.getState().falls).toBe(2);
  });

  it('keeps the clock running after a fall', () => {
    const store = createGameStore(1);
    store.getState().start(0);
    store.getState().fall();
    expect(store.getState().phase).toBe('playing');
    expect(elapsedMs(store.getState().timer, 4_000)).toBe(4_000);
  });

  it('restart resets the run and uses a new course', () => {
    const store = createGameStore(1);
    store.getState().start(0);
    store.getState().fall();
    store.getState().finish(8_000);
    store.getState().restart(99);
    const state = store.getState();
    expect(state.phase).toBe('ready');
    expect(state.seed).toBe(99);
    expect(state.run).toBe(1);
    expect(state.falls).toBe(0);
    expect(elapsedMs(state.timer, 20_000)).toBe(0);
  });

  it('restart without a seed draws a random one', () => {
    const store = createGameStore(1);
    const seeds = new Set<number>();
    for (let i = 0; i < 5; i++) {
      store.getState().restart();
      seeds.add(store.getState().seed);
    }
    expect(seeds.size).toBeGreaterThan(1);
    expect(store.getState().run).toBe(5);
  });

  it('can restart mid-race', () => {
    const store = createGameStore(1);
    store.getState().start(0);
    store.getState().restart(7);
    expect(store.getState().phase).toBe('ready');
    store.getState().start(3_000);
    expect(elapsedMs(store.getState().timer, 4_000)).toBe(1_000);
  });

  it('does not notify subscribers for ignored events', () => {
    const store = createGameStore(1);
    let calls = 0;
    store.subscribe(() => calls++);
    store.getState().finish(100);
    store.getState().fall();
    expect(calls).toBe(0);
    store.getState().start(0);
    expect(calls).toBe(1);
  });
});
