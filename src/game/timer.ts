/**
 * Race timer as plain data. Times are milliseconds from any monotonic clock
 * (`performance.now()` in the browser); callers pass `now` in, which keeps these functions pure.
 */
export interface Timer {
  startedAt: number | null;
  stoppedAt: number | null;
}

export const IDLE_TIMER: Timer = { startedAt: null, stoppedAt: null };

/** Starts the clock. Starting a clock that already started changes nothing. */
export function startTimer(timer: Timer, now: number): Timer {
  if (timer.startedAt !== null) return timer;
  return { startedAt: now, stoppedAt: null };
}

/** Stops a running clock. Stopping an idle or already-stopped clock changes nothing. */
export function stopTimer(timer: Timer, now: number): Timer {
  if (timer.startedAt === null || timer.stoppedAt !== null) return timer;
  return { ...timer, stoppedAt: Math.max(now, timer.startedAt) };
}

export function isRunning(timer: Timer): boolean {
  return timer.startedAt !== null && timer.stoppedAt === null;
}

/** Milliseconds on the clock: 0 before the start, frozen once stopped. */
export function elapsedMs(timer: Timer, now: number): number {
  if (timer.startedAt === null) return 0;
  return Math.max(0, (timer.stoppedAt ?? now) - timer.startedAt);
}

/** The recorded time of a finished run, or null while the clock is idle or running. */
export function finalTimeMs(timer: Timer): number | null {
  if (timer.startedAt === null || timer.stoppedAt === null) return null;
  return timer.stoppedAt - timer.startedAt;
}

/**
 * Race-style display: "7.05", "42.90", "1:03.27". Hundredths are truncated, never rounded up,
 * so the display never shows a time that has not been reached yet.
 */
export function formatTime(ms: number): string {
  const hundredths = Number.isFinite(ms) ? Math.floor(Math.max(0, ms) / 10) : 0;
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  const fraction = String(hundredths % 100).padStart(2, '0');

  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}.${fraction}`
    : `${seconds}.${fraction}`;
}
