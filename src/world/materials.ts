import { DoubleSide, MeshStandardMaterial } from 'three';
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
  checkpoint: flatMaterial(palette.checkpoint),
  tileA: flatMaterial(palette.tileA),
  tileB: flatMaterial(palette.tileB),
  wall: flatMaterial(palette.wall),
  line: flatMaterial(palette.line),
  obstacle: flatMaterial(palette.obstacle, { roughness: 0.6 }),
  obstacleHub: flatMaterial(palette.obstacleHub, { roughness: 0.6 }),
  trophy: flatMaterial(palette.trophy, { roughness: 0.4, metalness: 0.15 }),
  pedestal: flatMaterial(palette.pedestal),
  pole: flatMaterial(palette.pole),
  // A faint glow keeps coins readable in shadow and against the pale tiles.
  coin: new MeshStandardMaterial({
    color: palette.coin,
    emissive: palette.coinGlow,
    emissiveIntensity: 0.25,
    flatShading: true,
    roughness: 0.35,
    metalness: 0.2,
  }),
  // The flag cloth is a single flat triangle, seen from both sides.
  flag: new MeshStandardMaterial({ color: palette.flag, flatShading: true, side: DoubleSide }),
  flagReached: new MeshStandardMaterial({
    color: palette.flagReached,
    flatShading: true,
    side: DoubleSide,
  }),
};
