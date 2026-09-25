/** Course layout shared by the pure logic and the 3D world. Distances are in metres. */

/** Every block is a square tile of this size; the course runs along -Z. */
export const BLOCK_SIZE = 4;

/**
 * Every obstacle type, roughly in the order the levels introduce them. The world's obstacle
 * registry must provide a component for each.
 */
export const OBSTACLE_KINDS = [
  'spinner',
  'limbo',
  'sweeper',
  'bumpers',
  'turntable',
  'pistons',
  'hammer',
  'ramp',
] as const;
export type ObstacleKind = (typeof OBSTACLE_KINDS)[number];

/** Obstacles that bring their own floor, with a gap in it, instead of a solid tile. */
export const GAP_OBSTACLES: readonly string[] = ['ramp'] satisfies readonly ObstacleKind[];

/**
 * Bridges span a block-long gap with no floor below. `railed` has low rails, `open` has none,
 * and a `drawbridge` lifts its two leaves now and then, opening the gap.
 */
export const BRIDGE_KINDS = ['railed', 'open', 'drawbridge'] as const;
export type BridgeKind = (typeof BRIDGE_KINDS)[number];

/** Deck width of each bridge: at least 1.6 m, so a marble (0.6 m) can cross on a phone's stick. */
export const BRIDGE_WIDTH: Record<BridgeKind, number> = { railed: 1.6, open: 1.8, drawbridge: 2 };

/** Scenery themes; a course passes through several, fading from one to the next. */
export const THEMES = ['meadow', 'desert', 'snow', 'night'] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Distance over which one zone's look fades into the next one's: four blocks, so even the
 * biggest change (snow into night) takes a couple of seconds at full speed.
 */
export const ZONE_BLEND = 16;

// Defaults for generated courses (Endless mode). Hand-made levels set their own in levels.ts.

/** Obstacle blocks between the start and the finish. */
export const OBSTACLE_COUNT = 14;

/** Bridges between the start and the finish, spread among the obstacles. */
export const BRIDGE_COUNT = 3;

/** Range of the random speed multiplier handed to each obstacle and moving bridge. */
export const OBSTACLE_SPEED_RANGE = [1, 1.3] as const;

/** A checkpoint block follows every this many obstacles or bridges (0 = no checkpoints). */
export const CHECKPOINT_EVERY = 4;

/** Coins scattered along the course. */
export const COIN_COUNT = 7;

// Marble.

/**
 * Where the marble appears: height of its centre above the floor, and how far behind the centre
 * of the start (or checkpoint) block. checkpoints.ts turns these into positions.
 */
export const SPAWN_HEIGHT = 0.6;
export const SPAWN_OFFSET_Z = 0.8;

/** Below this height the marble counts as fallen off and respawns. */
export const FALL_LIMIT_Y = -4;

/** How long a jump press is remembered while the marble is still in the air (ms). */
export const JUMP_BUFFER_MS = 150;
