import { describe, expect, it } from 'vitest';
import {
  IDLE_TIMER,
  elapsedMs,
  finalTimeMs,
  formatTime,
  isRunning,
  startTimer,
  stopTimer,
} from './timer';

describe('timer', () => {
  it('reads zero until started', () => {
    expect(elapsedMs(IDLE_TIMER, 5_000)).toBe(0);
    expect(isRunning(IDLE_TIMER)).toBe(false);
  });

  it('counts from the start time while running', () => {
    const timer = startTimer(IDLE_TIMER, 1_000);
    expect(isRunning(timer)).toBe(true);
    expect(elapsedMs(timer, 1_000)).toBe(0);
    expect(elapsedMs(timer, 3_250)).toBe(2_250);
  });

  it('ignores a second start', () => {
    const timer = startTimer(IDLE_TIMER, 1_000);
    expect(startTimer(timer, 9_000)).toBe(timer);
  });

  it('freezes once stopped', () => {
    const timer = stopTimer(startTimer(IDLE_TIMER, 1_000), 4_500);
    expect(isRunning(timer)).toBe(false);
    expect(elapsedMs(timer, 4_500)).toBe(3_500);
    expect(elapsedMs(timer, 99_999)).toBe(3_500);
  });

  it('ignores stopping an idle or already stopped timer', () => {
    expect(stopTimer(IDLE_TIMER, 2_000)).toBe(IDLE_TIMER);
    const stopped = stopTimer(startTimer(IDLE_TIMER, 0), 1_000);
    expect(stopTimer(stopped, 5_000)).toBe(stopped);
  });

  it('has a final time only once stopped', () => {
    const running = startTimer(IDLE_TIMER, 1_000);
    expect(finalTimeMs(IDLE_TIMER)).toBeNull();
    expect(finalTimeMs(running)).toBeNull();
    expect(finalTimeMs(stopTimer(running, 13_370))).toBe(12_370);
  });

  it('never reports negative time', () => {
    const timer = startTimer(IDLE_TIMER, 1_000);
    expect(elapsedMs(timer, 500)).toBe(0);
    expect(elapsedMs(stopTimer(timer, 500), 2_000)).toBe(0);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0.00'],
    [7_050, '7.05'],
    [42_909, '42.90'],
    [59_999, '59.99'],
    [60_000, '1:00.00'],
    [63_270, '1:03.27'],
    [600_000, '10:00.00'],
  ])('formats %d ms as %s', (ms, text) => {
    expect(formatTime(ms)).toBe(text);
  });

  it('truncates instead of rounding up', () => {
    expect(formatTime(1_999)).toBe('1.99');
  });

  it('treats negative or invalid input as zero', () => {
    expect(formatTime(-50)).toBe('0.00');
    expect(formatTime(Number.NaN)).toBe('0.00');
  });
});
