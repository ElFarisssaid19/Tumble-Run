import { JUMP_BUFFER_MS } from './config';

export type MoveKey = 'forward' | 'backward' | 'left' | 'right';

/** x points right, y points forward (down the course). */
export interface Vec2 {
  x: number;
  y: number;
}

export type KeyState = Record<MoveKey, boolean>;

/** Keyboard and stick merged into one direction whose length never exceeds 1. */
export function combineMove(keys: KeyState, stick: Vec2): Vec2 {
  const x = Number(keys.right) - Number(keys.left) + stick.x;
  const y = Number(keys.forward) - Number(keys.backward) + stick.y;
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

/**
 * Player intent, written by the keyboard and touch handlers and read once per physics step by
 * the marble. It is a plain mutable object on purpose: it changes every frame and nothing needs
 * to re-render when it does.
 */
export interface Input {
  setKey(key: MoveKey, down: boolean): void;
  /** Analog stick, each axis in [-1, 1]. */
  setStick(x: number, y: number): void;
  /** Remembers a jump press made at `now` (ms). */
  pressJump(now: number): void;
  /**
   * Consumes a jump press if one happened within the buffer window, so a press made just before
   * landing still counts. Call it only when the marble is able to jump.
   */
  takeJump(now: number): boolean;
  move(): Vec2;
  /** True while a direction is held or a jump press is pending. */
  isActive(): boolean;
  /** Forgets everything, e.g. when the window loses focus mid-press. */
  clear(): void;
}

export function createInput(bufferMs = JUMP_BUFFER_MS): Input {
  const keys: KeyState = { forward: false, backward: false, left: false, right: false };
  const stick: Vec2 = { x: 0, y: 0 };
  let jumpPressedAt: number | null = null;

  const move = () => combineMove(keys, stick);

  return {
    setKey(key, down) {
      keys[key] = down;
    },
    setStick(x, y) {
      stick.x = clampUnit(x);
      stick.y = clampUnit(y);
    },
    pressJump(now) {
      jumpPressedAt = now;
    },
    takeJump(now) {
      const pressedAt = jumpPressedAt;
      jumpPressedAt = null;
      return pressedAt !== null && now - pressedAt <= bufferMs;
    },
    move,
    isActive() {
      const { x, y } = move();
      return x !== 0 || y !== 0 || jumpPressedAt !== null;
    },
    clear() {
      keys.forward = keys.backward = keys.left = keys.right = false;
      stick.x = stick.y = 0;
      jumpPressedAt = null;
    },
  };
}

function clampUnit(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
}

/** The one input shared by the keyboard, the touch controls and the marble. */
export const input = createInput();
