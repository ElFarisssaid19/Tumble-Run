import { describe, expect, it } from 'vitest';
import { BLOCK_SIZE, OBSTACLE_COUNT, OBSTACLE_SPEED_RANGE } from './config';
import { blockZ, generateCourse, type CourseBlock, type ObstacleSpec } from './course';

const KINDS = ['spinner', 'limbo', 'sweeper'] as const;

function obstaclesOf<K extends string>(blocks: CourseBlock<K>[]): ObstacleSpec<K>[] {
  return blocks.flatMap((block) => (block.type === 'obstacle' ? [block.obstacle] : []));
}

describe('generateCourse', () => {
  it('lays out start, obstacles and finish in a line', () => {
    const course = generateCourse({ seed: 1, kinds: KINDS });
    const types = course.blocks.map((block) => block.type);

    expect(types[0]).toBe('start');
    expect(types.at(-1)).toBe('finish');
    expect(types.filter((type) => type === 'obstacle')).toHaveLength(OBSTACLE_COUNT);
    expect(course.length).toBe((OBSTACLE_COUNT + 2) * BLOCK_SIZE);
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

  it('is deterministic for a given seed', () => {
    const a = generateCourse({ seed: 1234, kinds: KINDS });
    const b = generateCourse({ seed: 1234, kinds: KINDS });
    expect(a).toEqual(b);
  });

  it('varies with the seed', () => {
    const layouts = new Set(
      Array.from({ length: 20 }, (_, seed) =>
        JSON.stringify(obstaclesOf(generateCourse({ seed, kinds: KINDS }).blocks)),
      ),
    );
    expect(layouts.size).toBe(20);
  });

  it('uses every kind before repeating one', () => {
    for (let seed = 0; seed < 200; seed++) {
      const kinds = obstaclesOf(generateCourse({ seed, kinds: KINDS }).blocks).map((o) => o.kind);
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
    expect(empty.blocks.map((block) => block.type)).toEqual(['start', 'finish']);

    const long = generateCourse({ seed: 5, kinds: KINDS, obstacleCount: 12 });
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
