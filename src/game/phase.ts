/**
 * ready   → the marble waits on the start block, clock at zero
 * playing → the clock runs (entered on the first input)
 * ended   → the trophy was reached, clock frozen
 */
export type Phase = 'ready' | 'playing' | 'ended';

export type PhaseEvent = 'start' | 'finish' | 'restart';

const TRANSITIONS: Record<Phase, Partial<Record<PhaseEvent, Phase>>> = {
  ready: { start: 'playing', restart: 'ready' },
  playing: { finish: 'ended', restart: 'ready' },
  ended: { restart: 'ready' },
};

/** The phase after `event`; events that make no sense in the current phase are ignored. */
export function nextPhase(phase: Phase, event: PhaseEvent): Phase {
  return TRANSITIONS[phase][event] ?? phase;
}

export function canHandle(phase: Phase, event: PhaseEvent): boolean {
  return TRANSITIONS[phase][event] !== undefined;
}
