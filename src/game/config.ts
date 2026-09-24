/** Course layout shared by the pure logic and the 3D world. Distances are in metres. */

/** Every block is a square tile of this size; the course runs along -Z. */
export const BLOCK_SIZE = 4;

/** Every obstacle type. The world's obstacle registry must provide a component for each. */
export const OBSTACLE_KINDS = ['spinner', 'limbo', 'sweeper'] as const;
export type ObstacleKind = (typeof OBSTACLE_KINDS)[number];

// Defaults for generated courses (Endless mode). Hand-made levels set their own in levels.ts.

/** Obstacle blocks between the start and the finish. */
export const OBSTACLE_COUNT = 7;

/** Range of the random speed multiplier handed to each obstacle. */
export const OBSTACLE_SPEED_RANGE = [0.75, 1.5] as const;

/** A checkpoint block follows every this many obstacle blocks (0 = no checkpoints). */
export const CHECKPOINT_EVERY = 3;

/** Coins scattered along the course. */
export const COIN_COUNT = 4;

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
