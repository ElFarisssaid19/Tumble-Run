/**
 * menu    → the level select screen
 * ready   → the marble waits on the start block, clock at zero
 * playing → the clock runs (entered on the first input)
 * ended   → the trophy was reached, clock frozen
 */
export type Phase = 'menu' | 'ready' | 'playing' | 'ended';

/** select: a level or Endless course was picked · quit: back to the level select screen. */
export type PhaseEvent = 'select' | 'start' | 'finish' | 'restart' | 'quit';

const TRANSITIONS: Record<Phase, Partial<Record<PhaseEvent, Phase>>> = {
  menu: { select: 'ready' },
  ready: { start: 'playing', restart: 'ready', select: 'ready', quit: 'menu' },
  playing: { finish: 'ended', restart: 'ready', select: 'ready', quit: 'menu' },
  ended: { restart: 'ready', select: 'ready', quit: 'menu' },
};

/** The phase after `event`; events that make no sense in the current phase are ignored. */
export function nextPhase(phase: Phase, event: PhaseEvent): Phase {
  return TRANSITIONS[phase][event] ?? phase;
}

export function canHandle(phase: Phase, event: PhaseEvent): boolean {
  return TRANSITIONS[phase][event] !== undefined;
}
