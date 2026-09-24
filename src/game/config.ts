/** Course layout shared by the pure logic and the 3D world. Distances are in metres. */

/** Every block is a square tile of this size; the course runs along -Z. */
export const BLOCK_SIZE = 4;

/** Obstacle blocks between the start and the finish. */
export const OBSTACLE_COUNT = 7;

/** Range of the random speed multiplier handed to each obstacle. */
export const OBSTACLE_SPEED_RANGE = [0.75, 1.5] as const;

/** Below this height the marble counts as fallen off and goes back to the start. */
export const FALL_LIMIT_Y = -4;

/** How long a jump press is remembered while the marble is still in the air (ms). */
export const JUMP_BUFFER_MS = 150;
