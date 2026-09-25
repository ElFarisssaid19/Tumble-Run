import { DoubleSide, MeshBasicMaterial, MeshStandardMaterial, PointsMaterial } from 'three';
import { palette } from './palette';

/** Flat-shaded matte material: the low-poly look used across the world. */
export function flatMaterial(
  color: string,
  options: { roughness?: number; metalness?: number } = {},
) {
  return new MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0,
  });
}

/** Shared materials, created once so every block and obstacle reuses the same shader. */
export const materials = {
  // White, tinted per instance: floor tiles, walls and islands take their zone's colours.
  tinted: flatMaterial('#ffffff'),
  // Props carry their colours in their vertices (trunk and leaves in one mesh).
  props: new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
  // Night props glow softly: unlit, so they stay bright in the dusk.
  glowProps: new MeshBasicMaterial({ vertexColors: true }),
  line: flatMaterial(palette.line),
  obstacle: flatMaterial(palette.obstacle, { roughness: 0.6 }),
  obstacleHub: flatMaterial(palette.obstacleHub, { roughness: 0.6 }),
  trophy: flatMaterial(palette.trophy, { roughness: 0.4, metalness: 0.15 }),
  pedestal: flatMaterial(palette.pedestal),
  pole: flatMaterial(palette.pole),
  bumper: flatMaterial(palette.bumper, { roughness: 0.5 }),
  bumperCap: new MeshStandardMaterial({
    color: palette.bumperCap,
    emissive: palette.bumper,
    emissiveIntensity: 0.35,
    flatShading: true,
  }),
  disc: flatMaterial(palette.disc),
  ramp: flatMaterial(palette.ramp),
  deck: flatMaterial(palette.deck),
  deckEdge: flatMaterial(palette.deckEdge),
  rail: flatMaterial(palette.rail),
  lantern: new MeshStandardMaterial({
    color: palette.lantern,
    emissive: palette.lanternGlow,
    emissiveIntensity: 0.6,
    flatShading: true,
  }),
  // Stars ignore the fog and fade in only in night zones (the atmosphere sets the opacity).
  stars: new PointsMaterial({
    color: palette.stars,
    size: 0.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  }),
  moon: new MeshBasicMaterial({ color: palette.moon, fog: false, transparent: true, opacity: 0 }),
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
