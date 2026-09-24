export type Stars = 1 | 2 | 3;

/** Finishing at or under these times (ms) earns 3 or 2 stars; any finish earns 1. */
export interface StarTimes {
  three: number;
  two: number;
}

/** Extra stars for collecting every coin in the run (the total is still capped at 3). */
export const ALL_COINS_BONUS = 1;

export function timeStars(timeMs: number, times: StarTimes): Stars {
  if (timeMs <= times.three) return 3;
  if (timeMs <= times.two) return 2;
  return 1;
}

export function rateRun(timeMs: number, times: StarTimes, allCoins: boolean): Stars {
  const stars = timeStars(timeMs, times) + (allCoins ? ALL_COINS_BONUS : 0);
  return Math.min(stars, 3) as Stars;
}
