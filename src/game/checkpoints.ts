import { SPAWN_HEIGHT, SPAWN_OFFSET_Z } from './config';
import { blockZ, type Course } from './course';

export interface SpawnPoint {
  x: number;
  y: number;
  z: number;
}

/** Where every run starts: just behind the centre of the start block. */
export const START_SPAWN: SpawnPoint = { x: 0, y: SPAWN_HEIGHT, z: blockZ(0) + SPAWN_OFFSET_Z };

/**
 * The checkpoint to respawn at after touching `touched`: the furthest one reached so far, so
 * rolling back over an earlier flag never moves the respawn point backwards.
 */
export function advanceCheckpoint(current: number | null, touched: number): number | null {
  if (!Number.isInteger(touched) || touched < 0) return current;
  return current === null ? touched : Math.max(current, touched);
}

/** Where the marble (re)appears: the last checkpoint reached, or the start. */
export function spawnPoint(course: Course, checkpoint: number | null): SpawnPoint {
  const reached = checkpoint === null ? undefined : course.checkpoints[checkpoint];
  return reached ? { ...START_SPAWN, z: reached.z + SPAWN_OFFSET_Z } : START_SPAWN;
}
