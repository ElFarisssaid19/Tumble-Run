import { describe, expect, it } from 'vitest';
import { BLOCK_SIZE, ZONE_BLEND } from './config';
import { blockZ, generateCourse, type Zone } from './course';
import { themeMix } from './zones';

const course = generateCourse({
  seed: 5,
  kinds: ['limbo', 'spinner'],
  obstacleCount: 20,
  themes: ['meadow', 'desert', 'snow', 'night'],
});
const { zones } = course;
/** World z of the border after zone `i` (its last block's exit edge). */
const borderZ = (zone: Zone) => blockZ(zone.to) - BLOCK_SIZE / 2;
const first = course.blocks[0]?.z ?? 0;
const last = course.blocks.at(-1)?.z ?? 0;

describe('themeMix', () => {
  it('always adds up to 1, with no negative weight', () => {
    for (let z = first + 3; z > last - 3; z -= 0.37) {
      const weights = themeMix(zones, z);
      expect(weights).toHaveLength(zones.length);
      expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 10);
      for (const w of weights) expect(w).toBeGreaterThanOrEqual(0);
    }
  });

  it('is one pure theme away from the borders, including at the start and the finish', () => {
    expect(themeMix(zones, first)).toEqual([1, 0, 0, 0]);
    expect(themeMix(zones, last)).toEqual([0, 0, 0, 1]);
    zones.forEach((zone, i) => {
      const middle = (blockZ(zone.from) + blockZ(zone.to)) / 2;
      expect(themeMix(zones, middle)[i]).toBeCloseTo(1, 10);
    });
  });

  it('is half and half right on a border, and fades over ZONE_BLEND metres', () => {
    zones.slice(0, -1).forEach((zone, i) => {
      const z = borderZ(zone);
      expect(themeMix(zones, z)[i]).toBeCloseTo(0.5, 10);
      expect(themeMix(zones, z)[i + 1]).toBeCloseTo(0.5, 10);
      expect(themeMix(zones, z + ZONE_BLEND / 2)[i]).toBeCloseTo(1, 10);
      expect(themeMix(zones, z - ZONE_BLEND / 2)[i + 1]).toBeCloseTo(1, 10);
    });
  });

  it('changes smoothly: no jump between two points 5 cm apart', () => {
    // A smoothstep over ZONE_BLEND metres never changes faster than 1.5 / ZONE_BLEND per metre.
    const step = 0.05;
    const limit = (1.5 / ZONE_BLEND) * step + 1e-9;
    let previous = themeMix(zones, first);
    for (let z = first - step; z > last; z -= step) {
      const weights = themeMix(zones, z);
      weights.forEach((w, i) =>
        expect(Math.abs(w - (previous[i] ?? 0))).toBeLessThanOrEqual(limit),
      );
      previous = weights;
    }
  });

  it('only ever fades forward: each zone rises, holds, then falls once', () => {
    zones.forEach((_, i) => {
      let rising = true;
      let previous = -1;
      for (let z = first; z > last; z -= 0.25) {
        const w = themeMix(zones, z)[i] ?? 0;
        if (w < previous - 1e-12) rising = false;
        if (!rising) expect(w).toBeLessThanOrEqual(previous + 1e-12);
        previous = w;
      }
    });
  });

  it('is always the one theme on a single-zone course', () => {
    const single: Zone[] = [{ theme: 'snow', from: 0, to: 9 }];
    for (const z of [5, 0, -20, -80]) expect(themeMix(single, z)).toEqual([1]);
  });
});
