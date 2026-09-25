import { describe, expect, it } from 'vitest';
import {
  DRAWBRIDGE_MAX_LIFT,
  HAMMER_SWING,
  drawbridgeLift,
  hammerAngle,
  pistonExtension,
  turntableAngle,
} from './motion';

/** Samples t over `seconds`, 100 samples per second. */
const times = (seconds: number) => Array.from({ length: seconds * 100 }, (_, i) => i / 100);

describe('hammer', () => {
  const spec = { speed: 1, phase: 0.4, direction: 1 } as const;

  it('swings from one side to the other and back, within its amplitude', () => {
    const angles = times(10).map((t) => hammerAngle(t, spec));
    expect(Math.max(...angles)).toBeCloseTo(HAMMER_SWING, 2);
    expect(Math.min(...angles)).toBeCloseTo(-HAMMER_SWING, 2);
  });

  it('starts its swing the other way when the direction is flipped', () => {
    for (const t of [0, 0.7, 2.2]) {
      expect(hammerAngle(t, { ...spec, direction: -1 })).toBeCloseTo(-hammerAngle(t, spec), 12);
    }
  });

  it('swings faster at higher speed', () => {
    const period = (speed: number) => {
      const sign = (t: number) => Math.sign(hammerAngle(t, { ...spec, phase: 0, speed }));
      const crossings = times(20).filter((t, i, all) => i > 0 && sign(t) !== sign(all[i - 1] ?? 0));
      return (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1);
    };
    expect(period(1.3)).toBeLessThan(period(1));
  });
});

describe('pistons', () => {
  const spec = { speed: 1.1, phase: 2 };

  it('stays between tucked in (0) and fully out (1)', () => {
    for (const t of times(8)) {
      for (const second of [false, true]) {
        const e = pistonExtension(t, spec, second);
        expect(e).toBeGreaterThanOrEqual(0);
        expect(e).toBeLessThanOrEqual(1);
      }
    }
  });

  it('pushes in turn: one is out while the other is in', () => {
    for (const t of times(8)) {
      const sum = pistonExtension(t, spec, false) + pistonExtension(t, spec, true);
      expect(sum).toBeCloseTo(1, 12);
    }
  });
});

describe('turntable', () => {
  it('turns at a steady rate, one way or the other', () => {
    const spec = { speed: 1.2, phase: 0.5, direction: -1 } as const;
    const rate = (turntableAngle(2, spec) - turntableAngle(1, spec)) / 1;
    expect(rate).toBeCloseTo(-1.2 * 1.1, 12);
    expect(turntableAngle(0, spec)).toBe(0.5);
  });
});

describe('drawbridge', () => {
  const spec = { speed: 1, phase: 1.3 };
  const cycle = (2 * Math.PI) / 1.25;

  it('lifts no higher than its maximum and never below flat', () => {
    for (const t of times(12)) {
      const lift = drawbridgeLift(t, spec);
      expect(lift).toBeGreaterThanOrEqual(0);
      expect(lift).toBeLessThanOrEqual(DRAWBRIDGE_MAX_LIFT);
    }
    expect(Math.max(...times(12).map((t) => drawbridgeLift(t, spec)))).toBeCloseTo(
      DRAWBRIDGE_MAX_LIFT,
      2,
    );
  });

  it('lies flat, ready to cross, for more than half of each cycle', () => {
    const samples = Array.from({ length: 1000 }, (_, i) => (i / 1000) * cycle);
    const flat = samples.filter((t) => drawbridgeLift(t, spec) === 0).length / samples.length;
    expect(flat).toBeGreaterThan(0.5);
    expect(flat).toBeLessThan(0.6);
  });

  it('moves smoothly (no jumps between 10 ms samples)', () => {
    const lifts = times(12).map((t) => drawbridgeLift(t, spec));
    lifts.slice(1).forEach((lift, i) => {
      expect(Math.abs(lift - (lifts[i] ?? 0))).toBeLessThan(0.02);
    });
  });
});
