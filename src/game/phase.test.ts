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

  it('reports which events apply', () => {
    expect(canHandle('ready', 'start')).toBe(true);
    expect(canHandle('ready', 'finish')).toBe(false);
    expect(canHandle('ended', 'restart')).toBe(true);
  });
});
