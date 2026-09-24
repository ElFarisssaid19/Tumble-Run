import { describe, expect, it } from 'vitest';
import { canHandle, nextPhase } from './phase';

describe('nextPhase', () => {
  it('follows ready → playing → ended', () => {
    expect(nextPhase('ready', 'start')).toBe('playing');
    expect(nextPhase('playing', 'finish')).toBe('ended');
  });

  it('returns to ready on restart from any phase', () => {
    expect(nextPhase('ready', 'restart')).toBe('ready');
    expect(nextPhase('playing', 'restart')).toBe('ready');
    expect(nextPhase('ended', 'restart')).toBe('ready');
  });

  it('ignores events that do not fit the current phase', () => {
    expect(nextPhase('ready', 'finish')).toBe('ready');
    expect(nextPhase('playing', 'start')).toBe('playing');
    expect(nextPhase('ended', 'start')).toBe('ended');
    expect(nextPhase('ended', 'finish')).toBe('ended');
  });

  it('leaves the menu only by selecting a course', () => {
    expect(nextPhase('menu', 'select')).toBe('ready');
    for (const event of ['start', 'finish', 'restart', 'quit'] as const) {
      expect(nextPhase('menu', event)).toBe('menu');
    }
  });

  it('can switch course or quit to the menu from any other phase', () => {
    for (const phase of ['ready', 'playing', 'ended'] as const) {
      expect(nextPhase(phase, 'select')).toBe('ready');
      expect(nextPhase(phase, 'quit')).toBe('menu');
    }
  });

  it('reports which events apply', () => {
    expect(canHandle('ready', 'start')).toBe(true);
    expect(canHandle('ready', 'finish')).toBe(false);
    expect(canHandle('ended', 'restart')).toBe(true);
    expect(canHandle('menu', 'restart')).toBe(false);
  });
});
