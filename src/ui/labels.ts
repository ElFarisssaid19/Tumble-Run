import { getLevel, levelNumber, type LevelId } from '../game/levels';
import { formatSeed } from '../game/seedCode';

/** "Level 2 · Spin Cycle", or "Endless" for a generated course (its seed code is shown apart). */
export function courseTitle(levelId: LevelId | null): string {
  if (levelId === null) return 'Endless';
  return `Level ${levelNumber(levelId)} · ${getLevel(levelId)?.name ?? ''}`;
}

/** The seed code as shown on screen, e.g. "#1PKQ3XE". */
export function seedLabel(seed: number): string {
  return `#${formatSeed(seed)}`;
}
