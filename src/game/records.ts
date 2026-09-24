import type { Stars } from './rating';

/** A level's personal bests. Time and stars are tracked separately: they can come from different runs. */
export interface LevelRecord {
  bestTimeMs: number;
  bestStars: Stars;
}

export interface Records {
  /** By level id. */
  levels: Partial<Record<string, LevelRecord>>;
  /** Endless best times (ms) by seed code. */
  endless: Partial<Record<string, number>>;
}

export const EMPTY_RECORDS: Records = { levels: {}, endless: {} };

/** How a run's time compares with the previous best. */
export type BestOutcome = 'first' | 'improved' | 'kept';

export function compareBest(previousMs: number | undefined, timeMs: number): BestOutcome {
  if (previousMs === undefined) return 'first';
  return timeMs < previousMs ? 'improved' : 'kept';
}

export interface LevelRunUpdate {
  records: Records;
  previous: LevelRecord | undefined;
  time: BestOutcome;
  starsImproved: boolean;
}

export function recordLevelRun(
  records: Records,
  levelId: string,
  timeMs: number,
  stars: Stars,
): LevelRunUpdate {
  const previous = records.levels[levelId];
  const time = compareBest(previous?.bestTimeMs, timeMs);
  const starsImproved = previous !== undefined && stars > previous.bestStars;
  const next: LevelRecord = {
    bestTimeMs: time === 'kept' && previous ? previous.bestTimeMs : timeMs,
    bestStars: previous && previous.bestStars > stars ? previous.bestStars : stars,
  };
  return {
    records: { ...records, levels: { ...records.levels, [levelId]: next } },
    previous,
    time,
    starsImproved,
  };
}

export interface EndlessRunUpdate {
  records: Records;
  previousMs: number | undefined;
  time: BestOutcome;
}

export function recordEndlessRun(
  records: Records,
  seedCode: string,
  timeMs: number,
): EndlessRunUpdate {
  const previousMs = records.endless[seedCode];
  const time = compareBest(previousMs, timeMs);
  const bestMs = time === 'kept' && previousMs !== undefined ? previousMs : timeMs;
  return {
    records: { ...records, endless: { ...records.endless, [seedCode]: bestMs } },
    previousMs,
    time,
  };
}

// Persistence.

export const RECORDS_KEY = 'tumble-run/records/v1';

/** The part of the Web Storage API the game needs (localStorage in the browser, a fake in tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Reads saved records, dropping anything malformed instead of failing. */
export function parseRecords(raw: string | null): Records {
  let data: unknown;
  try {
    data = raw === null ? null : JSON.parse(raw);
  } catch {
    return EMPTY_RECORDS;
  }
  if (!isObject(data)) return EMPTY_RECORDS;

  // Object.fromEntries defines plain own properties: a saved "__proto__" key stays an ordinary
  // (ignored) entry, where `map[key] = value` would have replaced the map's prototype.
  const levels: Records['levels'] = Object.fromEntries(
    entriesOf(data.levels).flatMap(([id, entry]) =>
      isObject(entry) && isTime(entry.bestTimeMs) && isStars(entry.bestStars)
        ? [[id, { bestTimeMs: entry.bestTimeMs, bestStars: entry.bestStars }]]
        : [],
    ),
  );
  const endless: Records['endless'] = Object.fromEntries(
    entriesOf(data.endless).filter((entry): entry is [string, number] => isTime(entry[1])),
  );
  return { levels, endless };
}

function entriesOf(value: unknown): [string, unknown][] {
  return isObject(value) ? Object.entries(value) : [];
}

export function loadRecords(storage: KeyValueStorage | null): Records {
  try {
    return parseRecords(storage?.getItem(RECORDS_KEY) ?? null);
  } catch {
    return EMPTY_RECORDS;
  }
}

/** Saves records; returns false when storage is missing, full or blocked (e.g. private mode). */
export function saveRecords(storage: KeyValueStorage | null, records: Records): boolean {
  if (!storage) return false;
  try {
    storage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/** The browser's localStorage when it is usable, otherwise null (records then last one session). */
export function browserStorage(): KeyValueStorage | null {
  try {
    const storage = globalThis.localStorage;
    const probe = `${RECORDS_KEY}/probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isStars(value: unknown): value is Stars {
  return value === 1 || value === 2 || value === 3;
}
