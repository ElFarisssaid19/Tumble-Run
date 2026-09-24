import { useBeforePhysicsStep } from '@react-three/rapier';
import { useRef } from 'react';

/**
 * Calls `tick` before every physics step with the simulated time (seconds since mount).
 * Moving kinematic bodies here, rather than once per rendered frame, keeps them in lockstep with
 * the simulation whatever the display's frame rate.
 */
export function usePhysicsClock(tick: (time: number) => void) {
  const time = useRef(0);
  useBeforePhysicsStep((world) => {
    time.current += world.timestep;
    tick(time.current);
  });
}
