/** Adds coin `id` to the collected list. Duplicates and unknown ids leave the list unchanged. */
export function collectCoin(collected: readonly number[], id: number, total: number) {
  if (!Number.isInteger(id) || id < 0 || id >= total || collected.includes(id)) return collected;
  return [...collected, id];
}

/** True once every coin of a course with coins was collected. */
export function hasAllCoins(collected: readonly number[], total: number): boolean {
  return total > 0 && collected.length >= total;
}
