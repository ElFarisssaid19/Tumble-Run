/**
 * Tiny synthesized sound effects (Web Audio oscillators, no audio files). Every function is a
 * silent no-op where Web Audio is missing or blocked, so sound can never break the game.
 */

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    context ??= new AudioContext();
    // Browsers start the context suspended until the page has had a user gesture.
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
    return context;
  } catch {
    return null;
  }
}

/** Creates (or resumes) the audio context during a user gesture, so later sounds can play. */
export function unlockAudio(): void {
  audio();
}

interface Note {
  /** Hz. */
  pitch: number;
  /** Seconds after the call. */
  at: number;
  /** Seconds. */
  length: number;
  wave?: OscillatorType;
  volume?: number;
}

function play(notes: readonly Note[]): void {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const { pitch, at, length, wave = 'triangle', volume = 0.18 } of notes) {
    const start = now + at;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(pitch, start);
    // Quick attack, exponential decay: a soft "pling" without clicks.
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(envelope).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  }
}

/** Rising three-note chime (C6 E6 G6) for a new checkpoint. */
export function playCheckpoint(): void {
  play([
    { pitch: 1046.5, at: 0, length: 0.16 },
    { pitch: 1318.5, at: 0.08, length: 0.16 },
    { pitch: 1568, at: 0.16, length: 0.4 },
  ]);
}

/** Short two-note blip (B5 E6) for a coin. */
export function playCoin(): void {
  play([
    { pitch: 987.8, at: 0, length: 0.08, wave: 'square', volume: 0.06 },
    { pitch: 1318.5, at: 0.06, length: 0.22, wave: 'square', volume: 0.06 },
  ]);
}
