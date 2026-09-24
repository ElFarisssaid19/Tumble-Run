import { BLOCK_SIZE, OBSTACLE_COUNT, OBSTACLE_SPEED_RANGE } from './config';
import { createRng, type Rng } from './rng';

/** Random parameters for one obstacle. Each obstacle type decides what they mean for its motion. */
export interface ObstacleSpec<K extends string = string> {
  kind: K;
  /** Multiplier around 1 applied to the obstacle's own base speed. */
  speed: number;
  /** Starting phase in radians, so obstacles of the same type are out of sync. */
  phase: number;
  /** Spin direction or first swing direction. */
  direction: 1 | -1;
}

interface BlockBase {
  /** Position in the course, 0 being the start block. */
  index: number;
  /** World Z of the block centre. */
  z: number;
}

export type CourseBlock<K extends string = string> =
  | (BlockBase & { type: 'start' })
  | (BlockBase & { type: 'obstacle'; obstacle: ObstacleSpec<K> })
  | (BlockBase & { type: 'finish' });

export interface Course<K extends string = string> {
  seed: number;
  blocks: CourseBlock<K>[];
  /** Total length of the course along the Z axis. */
  length: number;
}

export interface CourseOptions<K extends string> {
  seed: number;
  /** Obstacle types to pick from (usually the keys of the obstacle registry). */
  kinds: readonly K[];
  obstacleCount?: number;
}

/** World Z of the centre of the block at `index`. */
export function blockZ(index: number): number {
  return index === 0 ? 0 : -index * BLOCK_SIZE; // (avoids -0 for the start block)
}

/** Builds a start block, `obstacleCount` random obstacle blocks and a finish block. */
export function generateCourse<K extends string>({
  seed,
  kinds,
  obstacleCount = OBSTACLE_COUNT,
}: CourseOptions<K>): Course<K> {
  const uniqueKinds = [...new Set(kinds)];
  if (uniqueKinds.length === 0) {
    throw new Error('generateCourse needs at least one obstacle kind');
  }

  const rng = createRng(seed);
  const order = drawKinds(rng, uniqueKinds, obstacleCount);

  const blocks: CourseBlock<K>[] = [{ type: 'start', index: 0, z: blockZ(0) }];
  order.forEach((kind, i) => {
    const index = i + 1;
    blocks.push({ type: 'obstacle', index, z: blockZ(index), obstacle: rollObstacle(rng, kind) });
  });
  const finishIndex = obstacleCount + 1;
  blocks.push({ type: 'finish', index: finishIndex, z: blockZ(finishIndex) });

  return { seed, blocks, length: blocks.length * BLOCK_SIZE };
}

/**
 * Draws obstacle kinds from a shuffled bag that refills when empty: every kind shows up before
 * any kind repeats, and (with two or more kinds) the same kind never appears twice in a row.
 */
function drawKinds<K extends string>(rng: Rng, kinds: readonly K[], count: number): K[] {
  const picked: K[] = [];
  let bag: K[] = [];

  while (picked.length < count) {
    if (bag.length === 0) {
      bag = rng.shuffle(kinds);
      // The bag is drawn from the end; avoid repeating the last kind across a refill.
      const last = picked.at(-1);
      if (bag.length > 1 && bag.at(-1) === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1] as K, bag[0] as K];
      }
    }
    picked.push(bag.pop() as K);
  }
  return picked;
}

function rollObstacle<K extends string>(rng: Rng, kind: K): ObstacleSpec<K> {
  const [minSpeed, maxSpeed] = OBSTACLE_SPEED_RANGE;
  return {
    kind,
    speed: rng.range(minSpeed, maxSpeed),
    phase: rng.range(0, Math.PI * 2),
    direction: rng.sign(),
  };
}
