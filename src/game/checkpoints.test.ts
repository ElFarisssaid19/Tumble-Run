import { describe, expect, it } from 'vitest';
import { START_SPAWN, advanceCheckpoint, spawnPoint } from './checkpoints';
import { SPAWN_HEIGHT, SPAWN_OFFSET_Z } from './config';
import { blockZ, generateCourse } from './course';

const KINDS = ['spinner', 'limbo', 'sweeper'] as const;

describe('advanceCheckpoint', () => {
  it('takes the first checkpoint touched', () => {
    expect(advanceCheckpoint(null, 0)).toBe(0);
    expect(advanceCheckpoint(null, 1)).toBe(1);
  });

  it('moves forward to a later checkpoint', () => {
    expect(advanceCheckpoint(0, 1)).toBe(1);
  });

  it('never moves back to an earlier checkpoint', () => {
    expect(advanceCheckpoint(2, 0)).toBe(2);
    expect(advanceCheckpoint(1, 1)).toBe(1);
  });

  it.each([-1, 0.5, Number.NaN])('ignores the invalid id %s', (id) => {
    expect(advanceCheckpoint(null, id)).toBeNull();
    expect(advanceCheckpoint(1, id)).toBe(1);
  });
});

describe('spawnPoint', () => {
  const course = generateCourse({ seed: 3, kinds: KINDS, obstacleCount: 9, checkpointEvery: 3 });

  it('is the start block before any checkpoint', () => {
    expect(spawnPoint(course, null)).toEqual(START_SPAWN);
    expect(START_SPAWN).toEqual({ x: 0, y: SPAWN_HEIGHT, z: blockZ(0) + SPAWN_OFFSET_Z });
  });

  it('is the reached checkpoint block, at the same place relative to it as the start', () => {
    course.checkpoints.forEach((checkpoint, id) => {
      expect(spawnPoint(course, id)).toEqual({
        x: 0,
        y: SPAWN_HEIGHT,
        z: checkpoint.z + SPAWN_OFFSET_Z,
      });
    });
  });

  it('falls back to the start for a checkpoint the course does not have', () => {
    expect(spawnPoint(course, 99)).toEqual(START_SPAWN);
  });
});

describe('checkpoint placement', () => {
  it('puts a checkpoint block after every N obstacles, but not after the last one', () => {
    const course = generateCourse({ seed: 8, kinds: KINDS, obstacleCount: 9, checkpointEvery: 3 });
    const types = course.blocks.map((block) => block.type[0]).join('');
    // s = start, o = obstacle, c = checkpoint, f = finish
    expect(types).toBe('sooocooocooof');
  });

  it('numbers checkpoints in order and keeps them in step with their blocks', () => {
    const course = generateCourse({ seed: 8, kinds: KINDS, obstacleCount: 10, checkpointEvery: 2 });
    expect(course.checkpoints.map((checkpoint) => checkpoint.id)).toEqual([0, 1, 2, 3]);
    for (const checkpoint of course.checkpoints) {
      const block = course.blocks[checkpoint.blockIndex];
      expect(block).toMatchObject({ type: 'checkpoint', checkpoint: checkpoint.id });
      expect(checkpoint.z).toBe(blockZ(checkpoint.blockIndex));
    }
  });

  it('supports courses without checkpoints', () => {
    const course = generateCourse({ seed: 8, kinds: KINDS, checkpointEvery: 0 });
    expect(course.checkpoints).toEqual([]);
    expect(course.blocks.some((block) => block.type === 'checkpoint')).toBe(false);
  });
});
