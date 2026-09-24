import { useRef, type PointerEvent } from 'react';
import { input } from '../game/input';
import { useIsTouch } from '../hooks/useIsTouch';

/** How far (px) the knob travels from the centre at full tilt. */
const STICK_RANGE = 46;
/** Ignore tiny thumb wobbles near the centre (fraction of full tilt). */
const DEAD_ZONE = 0.12;

/** On-screen joystick (bottom left) and jump button (bottom right) for touch screens. */
export function TouchControls() {
  const isTouch = useIsTouch();
  if (!isTouch) return null;

  return (
    <div className="touch">
      <Joystick />
      <button
        type="button"
        className="touch-jump"
        aria-label="Jump"
        onPointerDown={(event) => {
          event.preventDefault();
          input.pressJump(performance.now());
        }}
      >
        Jump
      </button>
    </div>
  );
}

function Joystick() {
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);

  const place = (dx: number, dy: number) => {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const origin = pointer.current;
    if (!origin || origin.id !== event.pointerId) return;

    let dx = event.clientX - origin.x;
    let dy = event.clientY - origin.y;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RANGE) {
      dx *= STICK_RANGE / distance;
      dy *= STICK_RANGE / distance;
    }
    place(dx, dy);

    // Rescale past the dead zone so the stick still reaches full strength at the rim.
    const tilt = Math.min(distance / STICK_RANGE, 1);
    const strength = tilt < DEAD_ZONE ? 0 : (tilt - DEAD_ZONE) / (1 - DEAD_ZONE);
    const scale = distance > 0 ? strength / distance : 0;
    // Screen y grows downwards; the stick's y is "forward".
    input.setStick(dx * scale, -dy * scale);
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    place(0, 0);
    input.setStick(0, 0);
  };

  return (
    <div
      className="stick"
      role="presentation"
      onPointerDown={(event) => {
        if (pointer.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const box = event.currentTarget.getBoundingClientRect();
        pointer.current = {
          id: event.pointerId,
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        };
        track(event);
      }}
      onPointerMove={track}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div ref={knob} className="stick-knob" />
    </div>
  );
}
