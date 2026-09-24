/**
 * Endless seeds are shown and typed as short base-36 codes ("1PKQ3XE"), so a run can be shared
 * and replayed. Any 32-bit seed fits in 7 characters.
 */
const MAX_SEED = 0xffffffff;

export function formatSeed(seed: number): string {
  return (seed >>> 0).toString(36).toUpperCase();
}

/** The seed for a typed code, or null if it isn't one. Spaces and a leading "#" are ignored. */
export function parseSeed(text: string): number | null {
  const code = text.trim().replace(/^#/, '').replace(/\s+/g, '').toUpperCase();
  if (!/^[0-9A-Z]{1,7}$/.test(code)) return null;
  const seed = parseInt(code, 36);
  return seed <= MAX_SEED ? seed : null;
}
