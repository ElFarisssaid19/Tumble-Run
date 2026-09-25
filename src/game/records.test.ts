import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLevelUnlocked } from './levels';
import {
  EMPTY_RECORDS,
  LEGACY_RECORDS_KEYS,
  RECORDS_KEY,
  browserStorage,
  compareBest,
  loadRecords,
  parseRecords,
  recordEndlessRun,
  recordLevelRun,
  saveRecords,
  type Records,
} from './records';
import { brokenStorage, memoryStorage } from './testing';

describe('compareBest', () => {
  it('calls the first finish "first"', () => {
    expect(compareBest(undefined, 12_000)).toBe('first');
  });

  it('calls a strictly faster time "improved"', () => {
    expect(compareBest(12_000, 11_990)).toBe('improved');
  });

  it('keeps the old best on a tie or a slower time', () => {
    expect(compareBest(12_000, 12_000)).toBe('kept');
    expect(compareBest(12_000, 15_000)).toBe('kept');
  });
});

describe('recordLevelRun', () => {
  it('stores the first finish as the best', () => {
    const update = recordLevelRun(EMPTY_RECORDS, 'warm-up', 9_000, 2);
    expect(update.time).toBe('first');
    expect(update.previous).toBeUndefined();
    expect(update.starsImproved).toBe(false);
    expect(update.records.levels['warm-up']).toEqual({ bestTimeMs: 9_000, bestStars: 2 });
  });

  it('replaces the best time with a faster one', () => {
    const first = recordLevelRun(EMPTY_RECORDS, 'warm-up', 9_000, 2).records;
    const update = recordLevelRun(first, 'warm-up', 8_000, 2);
    expect(update.time).toBe('improved');
    expect(update.previous).toEqual({ bestTimeMs: 9_000, bestStars: 2 });
    expect(update.records.levels['warm-up']).toEqual({ bestTimeMs: 8_000, bestStars: 2 });
  });

  it('tracks best time and best stars separately', () => {
    // A slower run that collected every coin can still earn more stars.
    const first = recordLevelRun(EMPTY_RECORDS, 'warm-up', 9_000, 2).records;
    const update = recordLevelRun(first, 'warm-up', 9_500, 3);
    expect(update.time).toBe('kept');
    expect(update.starsImproved).toBe(true);
    expect(update.records.levels['warm-up']).toEqual({ bestTimeMs: 9_000, bestStars: 3 });

    const worse = recordLevelRun(update.records, 'warm-up', 20_000, 1);
    expect(worse.records.levels['warm-up']).toEqual({ bestTimeMs: 9_000, bestStars: 3 });
  });

  it('leaves the input untouched and other levels alone', () => {
    const before: Records = { levels: { other: { bestTimeMs: 1_000, bestStars: 1 } }, endless: {} };
    const snapshot = structuredClone(before);
    const update = recordLevelRun(before, 'warm-up', 9_000, 2);
    expect(before).toEqual(snapshot);
    expect(update.records.levels.other).toEqual({ bestTimeMs: 1_000, bestStars: 1 });
  });
});

describe('recordEndlessRun', () => {
  it('keeps one best time per seed code', () => {
    let records = recordEndlessRun(EMPTY_RECORDS, 'ABC', 30_000).records;
    records = recordEndlessRun(records, 'XYZ', 40_000).records;
    const faster = recordEndlessRun(records, 'ABC', 25_000);
    expect(faster.time).toBe('improved');
    expect(faster.previousMs).toBe(30_000);
    expect(faster.records.endless).toEqual({ ABC: 25_000, XYZ: 40_000 });

    const slower = recordEndlessRun(faster.records, 'XYZ', 41_000);
    expect(slower.time).toBe('kept');
    expect(slower.records.endless.XYZ).toBe(40_000);
  });
});

describe('parseRecords', () => {
  it.each([
    ['nothing saved', null],
    ['invalid JSON', '{"levels": '],
    ['JSON null', 'null'],
    ['a number', '42'],
    ['a string', '"records"'],
    ['an array', '[1, 2]'],
    ['wrong field types', '{"levels": [], "endless": "fast"}'],
  ])('returns empty records for %s', (_, raw) => {
    expect(parseRecords(raw)).toEqual(EMPTY_RECORDS);
  });

  it('keeps valid entries and drops malformed ones', () => {
    const raw = JSON.stringify({
      levels: {
        'warm-up': { bestTimeMs: 8_500, bestStars: 3 },
        'spin-cycle': { bestTimeMs: -5, bestStars: 2 },
        crosswind: { bestTimeMs: 12_000, bestStars: 4 },
        gauntlet: { bestTimeMs: '12000', bestStars: 1 },
        'grand-tumble': { bestStars: 1 },
        extra: { bestTimeMs: 9_000, bestStars: 1, cheat: true },
      },
      endless: { ABC: 30_000, BAD: 0, WORSE: null, INF: 'Infinity' },
      unrelated: 'ignored',
    });
    expect(parseRecords(raw)).toEqual({
      levels: {
        'warm-up': { bestTimeMs: 8_500, bestStars: 3 },
        extra: { bestTimeMs: 9_000, bestStars: 1 },
      },
      endless: { ABC: 30_000 },
    });
  });

  it('keeps a "__proto__" key as plain data instead of changing prototypes', () => {
    const raw =
      '{"levels": {"__proto__": {"bestTimeMs": 1000, "bestStars": 3}},' +
      ' "endless": {"__proto__": 500}}';
    const records = parseRecords(raw);

    expect(Object.getPrototypeOf(records.levels)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(records.endless)).toBe(Object.prototype);
    expect('bestTimeMs' in records.levels).toBe(false);
    expect(Object.hasOwn(records.levels, '__proto__')).toBe(true);
    // Nothing leaked into other objects, and no level counts as beaten.
    expect('bestTimeMs' in {}).toBe(false);
    expect(isLevelUnlocked('spin-cycle', records)).toBe(false);
  });
});

describe('loadRecords / saveRecords', () => {
  it('round-trips records through storage', () => {
    const storage = memoryStorage();
    const records = recordEndlessRun(
      recordLevelRun(EMPTY_RECORDS, 'warm-up', 8_000, 3).records,
      '1PKQ3XE',
      21_000,
    ).records;

    expect(saveRecords(storage, records)).toBe(true);
    expect(storage.data.has(RECORDS_KEY)).toBe(true);
    expect(loadRecords(storage)).toEqual(records);
  });

  it('starts empty when nothing was saved or the save is corrupt', () => {
    expect(loadRecords(memoryStorage())).toEqual(EMPTY_RECORDS);
    expect(loadRecords(memoryStorage({ [RECORDS_KEY]: 'not json' }))).toEqual(EMPTY_RECORDS);
  });

  it('copes without storage', () => {
    expect(loadRecords(null)).toEqual(EMPTY_RECORDS);
    expect(saveRecords(null, EMPTY_RECORDS)).toBe(false);
  });

  it('copes with storage that throws (blocked or full)', () => {
    expect(loadRecords(brokenStorage)).toEqual(EMPTY_RECORDS);
    expect(saveRecords(brokenStorage, EMPTY_RECORDS)).toBe(false);
  });
});

describe('records version', () => {
  const OLD_KEY = 'tumble-run/records/v1';
  const oldRecords = JSON.stringify({
    levels: { 'warm-up': { bestTimeMs: 8_000, bestStars: 3 } },
    endless: { '1PKQ3XE': 21_000 },
  });

  it('keeps records under a new key now that the courses changed', () => {
    expect(RECORDS_KEY).toBe('tumble-run/records/v2');
    expect(LEGACY_RECORDS_KEYS).toContain(OLD_KEY);
    expect(LEGACY_RECORDS_KEYS).not.toContain(RECORDS_KEY);
  });

  it('ignores records from the old courses and deletes them', () => {
    const storage = memoryStorage({ [OLD_KEY]: oldRecords });
    expect(loadRecords(storage)).toEqual(EMPTY_RECORDS);
    expect(storage.data.has(OLD_KEY)).toBe(false);
    // No level counts as beaten any more: only Warm-Up is open.
    expect(isLevelUnlocked('spin-cycle', loadRecords(storage))).toBe(false);
  });

  it('keeps current records while dropping old ones', () => {
    const current = recordLevelRun(EMPTY_RECORDS, 'warm-up', 19_000, 2).records;
    const storage = memoryStorage({ [OLD_KEY]: oldRecords });
    saveRecords(storage, current);
    expect(loadRecords(storage)).toEqual(current);
    expect([...storage.data.keys()]).toEqual([RECORDS_KEY]);
  });

  it('copes with storage that cannot delete, or refuses to', () => {
    const storage = memoryStorage({ [OLD_KEY]: oldRecords });
    const withoutRemove = {
      getItem: (key: string) => storage.getItem(key),
      setItem: (key: string, value: string) => storage.setItem(key, value),
    };
    expect(loadRecords(withoutRemove)).toEqual(EMPTY_RECORDS);
    expect(() => loadRecords(brokenStorage)).not.toThrow();
    expect(loadRecords(brokenStorage)).toEqual(EMPTY_RECORDS);
  });
});

describe('browserStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns localStorage when it works', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    expect(browserStorage()).toBe(storage);
  });

  it('returns null when localStorage is missing', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(browserStorage()).toBeNull();
  });

  it('returns null when localStorage refuses writes', () => {
    vi.stubGlobal('localStorage', brokenStorage);
    expect(browserStorage()).toBeNull();
  });
});
