import { describe, expect, it } from 'vitest';
import {
  BLOCK_SIZE,
  BRIDGE_COUNT,
  BRIDGE_KINDS,
  CHECKPOINT_EVERY,
  OBSTACLE_COUNT,
  OBSTACLE_SPEED_RANGE,
  THEMES,
} from './config';
import {
  blockRuns,
  blockZ,
  generateCourse,
  hasSolidFloor,
  hasWalls,
  type CourseBlock,
  type ObstacleSpec,
} from './course';

const KINDS = [
  'spinner',
  'limbo',
  'sweeper',
  'bumpers',
  'turntable',
  'pistons',
  'hammer',
  'ramp',
] as const;

function obstaclesOf<K extends string>(blocks: CourseBlock<K>[]): ObstacleSpec<K>[] {
  return blocks.flatMap((block) => (block.type === 'obstacle' ? [block.obstacle] : []));
}

/** The course as a string: s start, o obstacle, b bridge, c checkpoint, f finish. */
function shape(blocks: CourseBlock[]): string {
  return blocks.map((block) => block.type[0]).join('');
}

describe('generateCourse', () => {
  it('lays out start, obstacles and bridges, checkpoints and finish in a line', () => {
    const course = generateCourse({ seed: 1, kinds: KINDS });
    const types = course.blocks.map((block) => block.type);
    const hazards = OBSTACLE_COUNT + BRIDGE_COUNT;
    // A checkpoint follows every CHECKPOINT_EVERY hazards, except after the last one.
    const checkpointCount = Math.floor((hazards - 1) / CHECKPOINT_EVERY);

    expect(types[0]).toBe('start');
    expect(types.at(-1)).toBe('finish');
    expect(types.filter((type) => type === 'obstacle')).toHaveLength(OBSTACLE_COUNT);
    expect(types.filter((type) => type === 'bridge')).toHaveLength(BRIDGE_COUNT);
    expect(types.filter((type) => type === 'checkpoint')).toHaveLength(checkpointCount);
    expect(course.length).toBe((hazards + checkpointCount + 2) * BLOCK_SIZE);
    course.blocks.forEach((block, i) => {
      expect(block.index).toBe(i);
      expect(block.z).toBe(blockZ(i));
    });
  });

  it('places blocks edge to edge along -Z', () => {
    expect(blockZ(0)).toBe(0);
    expect(blockZ(1)).toBe(-BLOCK_SIZE);
    expect(blockZ(3)).toBe(-3 * BLOCK_SIZE);
  });

  it('is deterministic for a given seed, bridges, zones and coins included', () => {
    const a = generateCourse({ seed: 1234, kinds: KINDS });
    const b = generateCourse({ seed: 1234, kinds: KINDS });
    expect(a).toEqual(b);
  });

  it('varies with the seed', () => {
    const layouts = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        JSON.stringify(generateCourse({ seed, kinds: KINDS }).blocks),
      ),
    );
    expect(layouts.size).toBe(20);
  });

  it('uses every kind before repeating one', () => {
    for (let seed = 0; seed < 200; seed++) {
      const kinds = obstaclesOf(
        generateCourse({ seed, kinds: KINDS, obstacleCount: 16 }).blocks,
      ).map((o) => o.kind);
      expect(new Set(kinds.slice(0, KINDS.length)).size).toBe(KINDS.length);
    }
  });

  it('never puts the same kind twice in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const kinds = obstaclesOf(
        generateCourse({ seed, kinds: KINDS, obstacleCount: 20 }).blocks,
      ).map((o) => o.kind);
      kinds.slice(1).forEach((kind, i) => expect(kind).not.toBe(kinds[i]));
    }
  });

  it('gives every obstacle speed, phase and direction within range', () => {
    const [minSpeed, maxSpeed] = OBSTACLE_SPEED_RANGE;
    for (let seed = 0; seed < 50; seed++) {
      for (const obstacle of obstaclesOf(generateCourse({ seed, kinds: KINDS }).blocks)) {
        expect(obstacle.speed).toBeGreaterThanOrEqual(minSpeed);
        expect(obstacle.speed).toBeLessThan(maxSpeed);
        expect(obstacle.phase).toBeGreaterThanOrEqual(0);
        expect(obstacle.phase).toBeLessThan(Math.PI * 2);
        expect([1, -1]).toContain(obstacle.direction);
      }
    }
  });

  it('supports any obstacle count, including none', () => {
    const empty = generateCourse({ seed: 5, kinds: KINDS, obstacleCount: 0 });
    expect(shape(empty.blocks)).toBe('sf');

    const long = generateCourse({ seed: 5, kinds: KINDS, obstacleCount: 12, bridgeCount: 0 });
    expect(obstaclesOf(long.blocks)).toHaveLength(12);
  });

  it('works with a single kind and ignores duplicate kinds', () => {
    const single = generateCourse({ seed: 3, kinds: ['spinner'] });
    expect(obstaclesOf(single.blocks).every((o) => o.kind === 'spinner')).toBe(true);

    const duplicated = generateCourse({ seed: 3, kinds: ['limbo', 'limbo', 'sweeper'] });
    const kinds = obstaclesOf(duplicated.blocks).map((o) => o.kind);
    kinds.slice(1).forEach((kind, i) => expect(kind).not.toBe(kinds[i]));
  });

  it('rejects an empty list of kinds', () => {
    expect(() => generateCourse({ seed: 1, kinds: [] })).toThrow();
  });
});

describe('bridges', () => {
  const bridgesOf = (blocks: CourseBlock[]) => blocks.filter((block) => block.type === 'bridge');

  it('spreads the requested bridges among the obstacles', () => {
    for (const bridgeCount of [0, 1, 3, 5]) {
      const course = generateCourse({ seed: 9, kinds: KINDS, obstacleCount: 12, bridgeCount });
      expect(bridgesOf(course.blocks)).toHaveLength(bridgeCount);
    }
  });

  it('never starts with a bridge and never puts two bridges in a row', () => {
    for (let seed = 0; seed < 300; seed++) {
      const course = generateCourse({ seed, kinds: KINDS, obstacleCount: 6, bridgeCount: 6 });
      const hazards = course.blocks.filter((b) => b.type === 'obstacle' || b.type === 'bridge');
      expect(hazards[0]?.type).toBe('obstacle');
      hazards.slice(1).forEach((hazard, i) => {
        if (hazard.type === 'bridge') expect(hazards[i]?.type).toBe('obstacle');
      });
    }
  });

  it('has no more bridges than obstacles, since each follows an obstacle', () => {
    const course = generateCourse({ seed: 4, kinds: KINDS, obstacleCount: 2, bridgeCount: 9 });
    expect(bridgesOf(course.blocks)).toHaveLength(2);
  });

  it('uses the requested bridge kinds, each before any repeats', () => {
    for (let seed = 0; seed < 50; seed++) {
      const course = generateCourse({ seed, kinds: KINDS, obstacleCount: 9, bridgeCount: 3 });
      const kinds = bridgesOf(course.blocks).map((b) => (b.type === 'bridge' ? b.bridge.kind : ''));
      expect(new Set(kinds)).toEqual(new Set(BRIDGE_KINDS));

      const railed = generateCourse({ seed, kinds: KINDS, bridgeKinds: ['railed'] });
      for (const bridge of bridgesOf(railed.blocks)) {
        expect(bridge.type === 'bridge' && bridge.bridge.kind).toBe('railed');
      }
    }
  });

  it('builds no bridges without bridge kinds', () => {
    const course = generateCourse({ seed: 2, kinds: KINDS, bridgeKinds: [] });
    expect(bridgesOf(course.blocks)).toHaveLength(0);
  });

  it('counts bridges as hazards between checkpoints', () => {
    const course = generateCourse({
      seed: 21,
      kinds: KINDS,
      obstacleCount: 6,
      bridgeCount: 2,
      checkpointEvery: 4,
    });
    const between = shape(course.blocks).slice(1, -1).split('c');
    expect(between.map((run) => run.length)).toEqual([4, 4]);
  });
});

describe('floors and walls', () => {
  const course = generateCourse({ seed: 77, kinds: KINDS, obstacleCount: 16, bridgeCount: 4 });

  it('leaves a gap under every bridge and ramp; everything else has a solid floor', () => {
    expect(course.blocks.some((block) => !hasSolidFloor(block))).toBe(true);
    for (const block of course.blocks) {
      const gap =
        block.type === 'bridge' || (block.type === 'obstacle' && block.obstacle.kind === 'ramp');
      expect(hasSolidFloor(block)).toBe(!gap);
    }
  });

  it('keeps walls everywhere except beside bridges', () => {
    for (const block of course.blocks) {
      expect(hasWalls(block)).toBe(block.type !== 'bridge');
    }
  });

  it('splits the floor into runs that stop at every gap', () => {
    const runs = blockRuns(course, hasSolidFloor);
    const covered = runs.flatMap(([first, last]) =>
      Array.from({ length: last - first + 1 }, (_, i) => first + i),
    );
    expect(covered).toEqual(course.blocks.filter(hasSolidFloor).map((block) => block.index));
    runs.slice(1).forEach(([first], i) => {
      const previousLast = runs[i]?.[1] ?? -1;
      expect(first).toBeGreaterThan(previousLast + 1);
    });
  });
});

describe('zones', () => {
  it('gives each theme one zone, in order, together covering every block', () => {
    for (let seed = 0; seed < 20; seed++) {
      const course = generateCourse({ seed, kinds: KINDS, themes: ['meadow', 'snow', 'night'] });
      expect(course.zones.map((zone) => zone.theme)).toEqual(['meadow', 'snow', 'night']);
      expect(course.zones[0]?.from).toBe(0);
      expect(course.zones.at(-1)?.to).toBe(course.blocks.length - 1);
      course.zones.slice(1).forEach((zone, i) => {
        expect(zone.from).toBe((course.zones[i]?.to ?? 0) + 1);
      });
    }
  });

  it('splits the course evenly', () => {
    const course = generateCourse({ seed: 1, kinds: KINDS, themes: THEMES });
    const sizes = course.zones.map((zone) => zone.to - zone.from + 1);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('never makes an empty zone on a very short course', () => {
    const course = generateCourse({ seed: 1, kinds: KINDS, obstacleCount: 1, bridgeCount: 0 });
    expect(course.blocks).toHaveLength(3);
    expect(course.zones).toHaveLength(3);
    for (const zone of course.zones) expect(zone.to).toBeGreaterThanOrEqual(zone.from);
  });
});
