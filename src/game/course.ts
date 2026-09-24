import {
  BLOCK_SIZE,
  CHECKPOINT_EVERY,
  COIN_COUNT,
  OBSTACLE_COUNT,
  OBSTACLE_SPEED_RANGE,
} from './config';
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
  /** An obstacle-free rest block with a checkpoint flag. */
  | (BlockBase & { type: 'checkpoint'; checkpoint: number })
  | (BlockBase & { type: 'finish' });

export interface Checkpoint {
  /** 0, 1, 2… in course order. */
  id: number;
  blockIndex: number;
  z: number;
}

export interface Coin {
  /** 0, 1, 2… in course order. */
  id: number;
  blockIndex: number;
  x: number;
  y: number;
  z: number;
}

export interface Course<K extends string = string> {
  seed: number;
  blocks: CourseBlock<K>[];
  checkpoints: Checkpoint[];
  coins: Coin[];
  /** Total length of the course along the Z axis. */
  length: number;
}

/** Everything that shapes a course apart from its seed. */
export interface CourseSettings<K extends string = string> {
  /** Obstacle types to pick from. */
  kinds: readonly K[];
  obstacleCount: number;
  speedRange: readonly [min: number, max: number];
  /** A checkpoint block follows every this many obstacle blocks (0 = none). */
  checkpointEvery: number;
  coinCount: number;
}

export type CourseOptions<K extends string> = { seed: number; kinds: readonly K[] } & Partial<
  Omit<CourseSettings<K>, 'kinds'>
>;

/** Coins float at marble height, away from the walls and from the obstacles in block centres. */
const COIN_HEIGHT = 0.45;
const COIN_SPREAD_X = 1.2;
const COIN_OFFSET_Z = [1.0, 1.4] as const;
/** Coins use their own random stream so they never change the obstacle layout of a seed. */
const COIN_STREAM = 0x5bd1e995;

/** World Z of the centre of the block at `index`. */
export function blockZ(index: number): number {
  return index === 0 ? 0 : -index * BLOCK_SIZE; // (avoids -0 for the start block)
}

/**
 * Builds a start block, the obstacle blocks (with a checkpoint block after every few of them) and
 * a finish block, then scatters coins. The same seed and settings always give the same course.
 */
export function generateCourse<K extends string>({
  seed,
  kinds,
  obstacleCount = OBSTACLE_COUNT,
  speedRange = OBSTACLE_SPEED_RANGE,
  checkpointEvery = CHECKPOINT_EVERY,
  coinCount = COIN_COUNT,
}: CourseOptions<K>): Course<K> {
  const uniqueKinds = [...new Set(kinds)];
  if (uniqueKinds.length === 0) {
    throw new Error('generateCourse needs at least one obstacle kind');
  }

  const rng = createRng(seed);
  const obstacles = drawKinds(rng, uniqueKinds, obstacleCount).map((kind) =>
    rollObstacle(rng, kind, speedRange),
  );

  const blocks: CourseBlock<K>[] = [{ type: 'start', index: 0, z: blockZ(0) }];
  const checkpoints: Checkpoint[] = [];
  const nextIndex = () => blocks.length;

  obstacles.forEach((obstacle, i) => {
    const index = nextIndex();
    blocks.push({ type: 'obstacle', index, z: blockZ(index), obstacle });

    const isLast = i === obstacles.length - 1;
    if (checkpointEvery > 0 && (i + 1) % checkpointEvery === 0 && !isLast) {
      const cpIndex = nextIndex();
      const checkpoint = { id: checkpoints.length, blockIndex: cpIndex, z: blockZ(cpIndex) };
      checkpoints.push(checkpoint);
      blocks.push({
        type: 'checkpoint',
        index: cpIndex,
        z: checkpoint.z,
        checkpoint: checkpoint.id,
      });
    }
  });

  const finishIndex = nextIndex();
  blocks.push({ type: 'finish', index: finishIndex, z: blockZ(finishIndex) });

  const coins = placeCoins(createRng((seed ^ COIN_STREAM) >>> 0), blocks, coinCount);
  return { seed, blocks, checkpoints, coins, length: blocks.length * BLOCK_SIZE };
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

function rollObstacle<K extends string>(
  rng: Rng,
  kind: K,
  [minSpeed, maxSpeed]: readonly [number, number],
): ObstacleSpec<K> {
  return {
    kind,
    speed: rng.range(minSpeed, maxSpeed),
    phase: rng.range(0, Math.PI * 2),
    direction: rng.sign(),
  };
}

/**
 * One coin per chosen block, with the blocks spread evenly along the course (never the start or
 * finish). A coin sits near the entry or the exit of its block, where the racing line passes.
 */
function placeCoins(rng: Rng, blocks: readonly CourseBlock[], count: number): Coin[] {
  const eligible = blocks.filter(
    (block) => block.type === 'obstacle' || block.type === 'checkpoint',
  );
  const total = Math.min(count, eligible.length);
  const coins: Coin[] = [];

  for (let id = 0; id < total; id++) {
    const from = Math.floor((id * eligible.length) / total);
    const to = Math.floor(((id + 1) * eligible.length) / total) - 1;
    const block = eligible[rng.int(from, to)] as CourseBlock;
    coins.push({
      id,
      blockIndex: block.index,
      x: rng.range(-COIN_SPREAD_X, COIN_SPREAD_X),
      y: COIN_HEIGHT,
      z: block.z + rng.sign() * rng.range(...COIN_OFFSET_Z),
    });
  }
  return coins;
}
