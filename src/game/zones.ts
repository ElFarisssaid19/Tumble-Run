import { BLOCK_SIZE, ZONE_BLEND } from './config';
import { blockZ, type Zone } from './course';

/**
 * How much each zone's look applies at world z, as weights that always add up to 1 (aligned with
 * `zones`). Inside a zone its weight is 1; across a border the next zone fades in along a
 * smoothstep ZONE_BLEND metres long, centred on the border, so the scenery never jumps.
 */
export function themeMix(zones: readonly Zone[], z: number): number[] {
  // Distance along the course (the course runs along -Z from the start block's entry edge).
  const along = BLOCK_SIZE / 2 - z;
  const weights: number[] = [];
  let reached = 1; // how far the fade has already moved past earlier zones
  zones.forEach((zone, i) => {
    const isLast = i === zones.length - 1;
    const leaving = isLast ? 0 : smoothstep(borderAlong(zone), along);
    weights.push(reached * (1 - leaving));
    reached *= leaving;
  });
  return weights;
}

/** Distance along the course of the border after `zone` (its last block's exit edge). */
function borderAlong(zone: Zone): number {
  return BLOCK_SIZE / 2 - (blockZ(zone.to) - BLOCK_SIZE / 2);
}

function smoothstep(border: number, along: number): number {
  const t = Math.min(1, Math.max(0, (along - (border - ZONE_BLEND / 2)) / ZONE_BLEND));
  return t * t * (3 - 2 * t);
}
