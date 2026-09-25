import type { KeyValueStorage } from './records';

/** In-memory stand-in for localStorage, for tests. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return Object.assign(storage, { data });
}

/** Storage that fails like a blocked or full localStorage (private mode, quota exceeded). */
export const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('SecurityError: storage is disabled');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError: storage is disabled');
  },
};
