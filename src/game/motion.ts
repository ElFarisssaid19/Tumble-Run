/**
 * How the moving obstacles and the drawbridge move, as pure functions of the time since the
 * course started (seconds, the physics clock). The 3D components apply them; tests check them.
 */

interface Motion {
  speed: number;
  phase: number;
}

interface DirectedMotion extends Motion {
  direction: 1 | -1;
}

/** Hammer: swing amplitude (rad) and cycle rate (rad/s at speed 1). */
export const HAMMER_SWING = 1.05;
const HAMMER_RATE = 1.5;

/** Angle of the hammer's arm from hanging straight down (rad, around the Z axis). */
export function hammerAngle(time: number, { speed, phase, direction }: DirectedMotion): number {
  return direction * HAMMER_SWING * Math.sin(phase + speed * HAMMER_RATE * time);
}

const PISTON_RATE = 2;

/** 0 when a pusher is tucked into its wall, 1 when fully out; the second runs half a cycle behind. */
export function pistonExtension(time: number, { speed, phase }: Motion, second: boolean): number {
  return (1 + Math.sin(phase + speed * PISTON_RATE * time + (second ? Math.PI : 0))) / 2;
}

const TURNTABLE_RATE = 1.1;

/** Turn of the turntable around the Y axis (rad). */
export function turntableAngle(time: number, { speed, phase, direction }: DirectedMotion): number {
  return phase + direction * speed * TURNTABLE_RATE * time;
}

/** Drawbridge: the leaves' highest angle (rad) and the cycle rate (rad/s at speed 1). */
export const DRAWBRIDGE_MAX_LIFT = 1.15;
const DRAWBRIDGE_RATE = 1.25;
/** The leaves lie flat while sin(cycle) is below this: a bit over half of every cycle. */
const DRAWBRIDGE_FLAT_BELOW = 0.15;

/** Angle of the drawbridge's leaves (rad): 0 when flat and crossable. */
export function drawbridgeLift(time: number, { speed, phase }: Motion): number {
  const s = Math.sin(phase + speed * DRAWBRIDGE_RATE * time);
  const t = (s - DRAWBRIDGE_FLAT_BELOW) / (1 - DRAWBRIDGE_FLAT_BELOW);
  return DRAWBRIDGE_MAX_LIFT * Math.min(1, Math.max(0, t));
}
