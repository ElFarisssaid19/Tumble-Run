import { describe, expect, it } from 'vitest';
import { combineMove, createInput } from './input';

const NO_KEYS = { forward: false, backward: false, left: false, right: false };

describe('combineMove', () => {
  it('maps keys to directions', () => {
    expect(combineMove({ ...NO_KEYS, forward: true }, { x: 0, y: 0 })).toEqual({ x: 0, y: 1 });
    expect(combineMove({ ...NO_KEYS, left: true }, { x: 0, y: 0 })).toEqual({ x: -1, y: 0 });
  });

  it('cancels opposite keys', () => {
    const move = combineMove({ ...NO_KEYS, forward: true, backward: true }, { x: 0, y: 0 });
    expect(move).toEqual({ x: 0, y: 0 });
  });

  it('keeps diagonals at unit length', () => {
    const move = combineMove({ ...NO_KEYS, forward: true, right: true }, { x: 0, y: 0 });
    expect(Math.hypot(move.x, move.y)).toBeCloseTo(1);
    expect(move.x).toBeCloseTo(move.y);
  });

  it('keeps partial stick input as is', () => {
    expect(combineMove(NO_KEYS, { x: 0.3, y: -0.4 })).toEqual({ x: 0.3, y: -0.4 });
  });

  it('adds keys and stick, then clamps', () => {
    const move = combineMove({ ...NO_KEYS, forward: true }, { x: 0, y: 0.8 });
    expect(move).toEqual({ x: 0, y: 1 });
  });
});

describe('createInput', () => {
  it('is idle until something is pressed', () => {
    const input = createInput();
    expect(input.isActive()).toBe(false);
    input.setKey('right', true);
    expect(input.isActive()).toBe(true);
    expect(input.move()).toEqual({ x: 1, y: 0 });
    input.setKey('right', false);
    expect(input.isActive()).toBe(false);
  });

  it('clamps the stick to [-1, 1] and ignores invalid values', () => {
    const input = createInput();
    input.setStick(5, Number.NaN);
    expect(input.move()).toEqual({ x: 1, y: 0 });
  });

  it('buffers a jump press for a short time', () => {
    const input = createInput(150);
    input.pressJump(1_000);
    expect(input.isActive()).toBe(true);
    expect(input.takeJump(1_100)).toBe(true);
    expect(input.takeJump(1_101)).toBe(false);
  });

  it('drops a jump press that is too old', () => {
    const input = createInput(150);
    input.pressJump(1_000);
    expect(input.takeJump(1_200)).toBe(false);
    expect(input.isActive()).toBe(false);
  });

  it('clears everything', () => {
    const input = createInput();
    input.setKey('forward', true);
    input.setStick(0.5, 0.5);
    input.pressJump(0);
    input.clear();
    expect(input.isActive()).toBe(false);
    expect(input.takeJump(0)).toBe(false);
  });
});
