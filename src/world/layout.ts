import { BLOCK_SIZE } from '../game/config';

/** Measurements of the 3D world, in metres. The floor's top surface is at y = 0. */

export const HALF_BLOCK = BLOCK_SIZE / 2;
export const FLOOR_DEPTH = 0.3;

/** Side walls: low enough that a careless jump or a hard knock can still send you over. */
export const WALL_HEIGHT = 0.6;
export const WALL_THICKNESS = 0.3;
export const END_WALL_HEIGHT = 1.4;

export const MARBLE_RADIUS = 0.3;
export const MARBLE_NAME = 'marble';

/** Distance from the finish block's centre to its finish line (towards the start). */
export const FINISH_LINE_OFFSET = 1;
