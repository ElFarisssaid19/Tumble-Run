/**
 * Small deterministic random number generator: the same seed always yields the same sequence,
 * which makes every course reproducible (and testable) from a single number.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max], both ends included. */
  int(min: number, max: number): number;
  /** Randomly -1 or +1. */
  sign(): 1 | -1;
  /** Shuffled copy of `items` (the input is left untouched). */
  shuffle<T>(items: readonly T[]): T[];
}

const UINT32_RANGE = 2 ** 32;

/** SplitMix-style generator: a 32-bit counter stepped by the golden ratio, then scrambled. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const nextUint32 = (): number => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    return (z ^ (z >>> 15)) >>> 0;
  };

  const next = () => nextUint32() / UINT32_RANGE;

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    sign: () => (next() < 0.5 ? -1 : 1),
    shuffle<T>(items: readonly T[]): T[] {
      const out = [...items];
      // Fisher–Yates, walking down from the end.
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const held = out[i] as T;
        out[i] = out[j] as T;
        out[j] = held;
      }
      return out;
    },
  };
}

/** A fresh, non-deterministic seed for a new run. */
export function randomSeed(): number {
  return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
}
