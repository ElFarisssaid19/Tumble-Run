import { MeshStandardMaterial } from 'three';
import { palette } from './palette';

/** Flat-shaded matte material: the low-poly look used across the world. */
export function flatMaterial(color: string, options: { roughness?: number; metalness?: number } = {}) {
  return new MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0,
  });
}

/** Shared materials, created once so every block and obstacle reuses the same shader. */
export const materials = {
  start: flatMaterial(palette.start),
  finish: flatMaterial(palette.finish),
  tileA: flatMaterial(palette.tileA),
  tileB: flatMaterial(palette.tileB),
  wall: flatMaterial(palette.wall),
  line: flatMaterial(palette.line),
  obstacle: flatMaterial(palette.obstacle, { roughness: 0.6 }),
  obstacleHub: flatMaterial(palette.obstacleHub, { roughness: 0.6 }),
  trophy: flatMaterial(palette.trophy, { roughness: 0.4, metalness: 0.15 }),
  pedestal: flatMaterial(palette.pedestal),
};
