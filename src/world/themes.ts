import { Color } from 'three';
import type { Theme } from '../game/config';

/** Everything that changes from one scenery zone to the next. */
export interface ThemeLook {
  /** Background and fog. */
  sky: string;
  /** Hemisphere light: from above, from below, and its strength. */
  skyLight: string;
  groundLight: string;
  ambient: number;
  sun: string;
  sunIntensity: number;
  /** Obstacle tiles alternate between these two. */
  tileA: string;
  tileB: string;
  wall: string;
  /** Floating islands around the course: rock and grass (or sand, snow…) on top. */
  island: string;
  islandTop: string;
  /** Loose rocks drifting in the sky. */
  rock: string;
  /** How much the starry sky shows (0–1). */
  stars: number;
}

/** Four pastel lands. Night is a soft dusk, never black, so the style stays the same. */
export const THEME_LOOKS: Record<Theme, ThemeLook> = {
  meadow: {
    sky: '#fbe9f1',
    skyLight: '#fff8fb',
    groundLight: '#ddd5f6',
    ambient: 2.2,
    sun: '#fff3e3',
    sunIntensity: 1.7,
    tileA: '#d6daf6',
    tileB: '#cfe6f6',
    wall: '#f8c6d4',
    island: '#e6cdbb',
    islandTop: '#bfe8c4',
    rock: '#d7cff6',
    stars: 0,
  },
  desert: {
    sky: '#fde6cf',
    skyLight: '#fff6ea',
    groundLight: '#f1d4bf',
    ambient: 2.2,
    sun: '#fff0d4',
    sunIntensity: 2,
    tileA: '#f7e4c0',
    tileB: '#f2d6ab',
    wall: '#f1b9a3',
    island: '#e8bd98',
    islandTop: '#f6dcab',
    rock: '#f4c9a8',
    stars: 0,
  },
  snow: {
    sky: '#e4eefa',
    skyLight: '#f7fbff',
    groundLight: '#d6e0f2',
    ambient: 2.3,
    sun: '#f1f5ff',
    sunIntensity: 1.6,
    tileA: '#eef3fb',
    tileB: '#dde8f6',
    wall: '#c6d7f1',
    island: '#c7d4e9',
    islandTop: '#f8fbff',
    rock: '#cfe0f5',
    stars: 0,
  },
  night: {
    sky: '#5d578f',
    skyLight: '#b3aaf0',
    groundLight: '#4a4478',
    ambient: 1.9,
    sun: '#d6d0ff',
    sunIntensity: 1.1,
    tileA: '#a79fe0',
    tileB: '#978fd4',
    wall: '#c5b3ef',
    island: '#6c64aa',
    islandTop: '#8a82c9',
    rock: '#7d75bd',
    stars: 1,
  },
};

type ColorKey = {
  [K in keyof ThemeLook]: ThemeLook[K] extends string ? K : never;
}[keyof ThemeLook];
type NumberKey = {
  [K in keyof ThemeLook]: ThemeLook[K] extends number ? K : never;
}[keyof ThemeLook];

// Parsed once: blending runs every frame.
const parsed = new Map<string, Color>();
function colorOf(hex: string): Color {
  let color = parsed.get(hex);
  if (!color) parsed.set(hex, (color = new Color(hex)));
  return color;
}

/**
 * Blends one colour of several themes by weight (from `themeMix`) into `target`. Mixing happens
 * in linear colour space, so a fade never dips through a muddy middle.
 */
export function mixColor(
  themes: readonly Theme[],
  weights: readonly number[],
  key: ColorKey,
  target: Color,
): Color {
  target.setRGB(0, 0, 0);
  themes.forEach((theme, i) => {
    const w = weights[i] ?? 0;
    if (w <= 0) return;
    const c = colorOf(THEME_LOOKS[theme][key]);
    target.r += c.r * w;
    target.g += c.g * w;
    target.b += c.b * w;
  });
  return target;
}

export function mixNumber(themes: readonly Theme[], weights: readonly number[], key: NumberKey) {
  return themes.reduce((sum, theme, i) => sum + THEME_LOOKS[theme][key] * (weights[i] ?? 0), 0);
}
