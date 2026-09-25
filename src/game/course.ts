import {
  BLOCK_SIZE,
  BRIDGE_COUNT,
  BRIDGE_KINDS,
  CHECKPOINT_EVERY,
  COIN_COUNT,
  GAP_OBSTACLES,
  OBSTACLE_COUNT,
  OBSTACLE_SPEED_RANGE,
  THEMES,
  type BridgeKind,
  type Theme,
} from './config';
import { createRng, type Rng } from './rng';

/** Random parameters for one obstacle. Each obstacle type decides what they mean for its motion. */
export interface ObstacleSpec<K extends string = string> {
  kind: K;
  /** Multiplier around 1 applied to the obstacle's own base speed. */
  speed: number;
  /** Starting phase in radians, so obstacles of the same type are out of sync. */
  phase: number;
  /** Spin direction, first swing direction or which side goes first. */
  direction: 1 | -1;
}

/** A bridge over a block-long gap. Only a drawbridge moves; `speed` and `phase` time its leaves. */
export interface BridgeSpec {
  kind: BridgeKind;
  speed: number;
  phase: number;
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
  /** A gap with a bridge across it: no floor and no walls beside the deck. */
  | (BlockBase & { type: 'bridge'; bridge: BridgeSpec })
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

/** A run of blocks sharing a scenery theme: blocks `from` to `to`, both included. */
export interface Zone {
  theme: Theme;
  from: number;
  to: number;
}

export interface Course<K extends string = string> {
  seed: number;
  blocks: CourseBlock<K>[];
  checkpoints: Checkpoint[];
  coins: Coin[];
  /** Scenery zones in course order, covering every block. */
  zones: Zone[];
  /** Total length of the course along the Z axis. */
  length: number;
}

/** Everything that shapes a course apart from its seed. */
export interface CourseSettings<K extends string = string> {
  /** Obstacle types to pick from. */
  kinds: readonly K[];
  obstacleCount: number;
  /** Bridge types to pick from, and how many bridges to spread among the obstacles. */
  bridgeKinds: readonly BridgeKind[];
  bridgeCount: number;
  speedRange: readonly [min: number, max: number];
  /** A checkpoint block follows every this many obstacles or bridges (0 = none). */
  checkpointEvery: number;
  coinCount: number;
  /** Scenery themes, one zone each, in course order. */
  themes: readonly Theme[];
}

export type CourseOptions<K extends string> = { seed: number; kinds: readonly K[] } & Partial<
  Omit<CourseSettings<K>, 'kinds'>
>;

/** Coins float at marble height, near the racing line and clear of the obstacles. */
const COIN_HEIGHT = 0.45;
const COIN_SPREAD_X = 1.2;
/** Distance of a coin from its block's centre: near the entry or the exit… */
const COIN_OFFSET_Z = [1.0, 1.4] as const;
/** …or right at the block's edge, for obstacles that fill the middle of the block. */
const COIN_EDGE_OFFSET_Z = [1.55, 1.85] as const;
const EDGE_COIN_KINDS: readonly string[] = ['bumpers', 'pistons', 'turntable'];
/** On a bridge, on the middle of the deck. */
const COIN_BRIDGE_OFFSET_Z = [0.6, 1.4] as const;
/** Coins use their own random stream so they never change the obstacle layout of a seed. */
const COIN_STREAM = 0x5bd1e995;

/** World Z of the centre of the block at `index`. */
export function blockZ(index: number): number {
  return index === 0 ? 0 : -index * BLOCK_SIZE; // (avoids -0 for the start block)
}

/** False for bridges and gap obstacles, which bring their own floor. */
export function hasSolidFloor(block: CourseBlock): boolean {
  if (block.type === 'bridge') return false;
  return block.type !== 'obstacle' || !GAP_OBSTACLES.includes(block.obstacle.kind);
}

/** False for bridges: the gap beside the deck is open. */
export function hasWalls(block: CourseBlock): boolean {
  return block.type !== 'bridge';
}

/** Runs of consecutive blocks that pass `test`, as [first, last] block indices. */
export function blockRuns(
  course: Pick<Course, 'blocks'>,
  test: (block: CourseBlock) => boolean,
): [first: number, last: number][] {
  const runs: [number, number][] = [];
  for (const block of course.blocks) {
    if (!test(block)) continue;
    const last = runs.at(-1);
    if (last && last[1] === block.index - 1) last[1] = block.index;
    else runs.push([block.index, block.index]);
  }
  return runs;
}

/**
 * Builds a start block, the hazards (obstacles, with bridges spread among them), a checkpoint
 * block after every few hazards and a finish block, then splits the course into scenery zones
 * and scatters coins. The same seed and settings always give the same course.
 */
export function generateCourse<K extends string>({
  seed,
  kinds,
  obstacleCount = OBSTACLE_COUNT,
  bridgeKinds = BRIDGE_KINDS,
  bridgeCount = BRIDGE_COUNT,
  speedRange = OBSTACLE_SPEED_RANGE,
  checkpointEvery = CHECKPOINT_EVERY,
  coinCount = COIN_COUNT,
  themes = THEMES,
}: CourseOptions<K>): Course<K> {
  const uniqueKinds = [...new Set(kinds)];
  if (uniqueKinds.length === 0) {
    throw new Error('generateCourse needs at least one obstacle kind');
  }
  const uniqueBridges = [...new Set(bridgeKinds)];
  // Every bridge follows at least one obstacle, so there can't be more bridges than obstacles.
  const bridges = uniqueBridges.length === 0 ? 0 : Math.min(bridgeCount, obstacleCount);

  const rng = createRng(seed);
  const hazardCount = obstacleCount + bridges;
  const bridgeSlots = pickBridgeSlots(rng, hazardCount, bridges);
  const obstacleOrder = drawKinds(rng, uniqueKinds, obstacleCount);
  const bridgeOrder = drawKinds(rng, uniqueBridges, bridgeSlots.size);

  const blocks: CourseBlock<K>[] = [{ type: 'start', index: 0, z: blockZ(0) }];
  const checkpoints: Checkpoint[] = [];
  const nextIndex = () => blocks.length;
  let obstaclesPlaced = 0;
  let bridgesPlaced = 0;

  for (let hazard = 0; hazard < hazardCount; hazard++) {
    const index = nextIndex();
    const bridgeKind = bridgeSlots.has(hazard) ? bridgeOrder[bridgesPlaced++] : undefined;
    const obstacleKind = bridgeKind ? undefined : obstacleOrder[obstaclesPlaced++];
    if (bridgeKind) {
      const bridge = rollBridge(rng, bridgeKind, speedRange);
      blocks.push({ type: 'bridge', index, z: blockZ(index), bridge });
    } else if (obstacleKind) {
      const obstacle = rollObstacle(rng, obstacleKind, speedRange);
      blocks.push({ type: 'obstacle', index, z: blockZ(index), obstacle });
    }

    const isLast = hazard === hazardCount - 1;
    if (checkpointEvery > 0 && (hazard + 1) % checkpointEvery === 0 && !isLast) {
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
  }

  const finishIndex = nextIndex();
  blocks.push({ type: 'finish', index: finishIndex, z: blockZ(finishIndex) });

  const coins = placeCoins(createRng((seed ^ COIN_STREAM) >>> 0), blocks, coinCount);
  return {
    seed,
    blocks,
    checkpoints,
    coins,
    zones: splitZones(blocks.length, themes),
    length: blocks.length * BLOCK_SIZE,
  };
}

/**
 * Which hazards (by position) are bridges: one in each equal share of the hazards, never the
 * very first hazard and never two in a row. With at most as many bridges as obstacles, every
 * share holds at least two hazards.
 */
function pickBridgeSlots(rng: Rng, hazardCount: number, bridgeCount: number): Set<number> {
  const slots = new Set<number>();
  for (let i = 0; i < bridgeCount; i++) {
    const first = Math.floor((i * hazardCount) / bridgeCount);
    const last = Math.floor(((i + 1) * hazardCount) / bridgeCount) - 1;
    // Skipping each share's first slot keeps bridges apart and off the first hazard.
    slots.add(rng.int(first + 1, last));
  }
  return slots;
}

/**
 * Draws kinds from a shuffled bag that refills when empty: every kind shows up before any kind
 * repeats, and (with two or more kinds) the same kind never appears twice in a row.
 */
function drawKinds<T>(rng: Rng, kinds: readonly T[], count: number): T[] {
  const picked: T[] = [];
  let bag: T[] = [];

  while (picked.length < count) {
    if (bag.length === 0) {
      bag = rng.shuffle(kinds);
      // The bag is drawn from the end; avoid repeating the last kind across a refill.
      const last = picked.at(-1);
      if (bag.length > 1 && bag.at(-1) === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1] as T, bag[0] as T];
      }
    }
    picked.push(bag.pop() as T);
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

function rollBridge(
  rng: Rng,
  kind: BridgeKind,
  [minSpeed, maxSpeed]: readonly [number, number],
): BridgeSpec {
  return { kind, speed: rng.range(minSpeed, maxSpeed), phase: rng.range(0, Math.PI * 2) };
}

/** One zone per theme, splitting the blocks as evenly as possible (a zone is never empty). */
function splitZones(blockCount: number, themes: readonly Theme[]): Zone[] {
  const list = themes.length > 0 ? themes : THEMES.slice(0, 1);
  const count = Math.min(list.length, blockCount);
  return list.slice(0, count).map((theme, i) => ({
    theme,
    from: Math.round((i * blockCount) / count),
    to: Math.round(((i + 1) * blockCount) / count) - 1,
  }));
}

/**
 * One coin per chosen block, with the blocks spread evenly along the course (never the start,
 * the finish or a ramp's gap). Each coin sits on the racing line: near the entry or exit of an
 * obstacle block, at the edge of a block whose middle is busy, or on a bridge's deck.
 */
function placeCoins(rng: Rng, blocks: readonly CourseBlock[], count: number): Coin[] {
  const eligible = blocks.filter(
    (block) =>
      block.type === 'checkpoint' ||
      block.type === 'bridge' ||
      (block.type === 'obstacle' && hasSolidFloor(block)),
  );
  const total = Math.min(count, eligible.length);
  const coins: Coin[] = [];

  for (let id = 0; id < total; id++) {
    const from = Math.floor((id * eligible.length) / total);
    const to = Math.floor(((id + 1) * eligible.length) / total) - 1;
    const block = eligible[rng.int(from, to)] as CourseBlock;
    const onBridge = block.type === 'bridge';
    const atEdge = block.type === 'obstacle' && EDGE_COIN_KINDS.includes(block.obstacle.kind);
    const offset = onBridge ? COIN_BRIDGE_OFFSET_Z : atEdge ? COIN_EDGE_OFFSET_Z : COIN_OFFSET_Z;
    const x = rng.range(-COIN_SPREAD_X, COIN_SPREAD_X);
    coins.push({
      id,
      blockIndex: block.index,
      x: onBridge ? 0 : x,
      y: COIN_HEIGHT,
      z: block.z + rng.sign() * rng.range(offset[0], offset[1]),
    });
  }
  return coins;
}
