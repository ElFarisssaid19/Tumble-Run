import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry } from 'three';
import { materials } from '../materials';
import type { ObstacleProps } from './types';
import { usePhysicsClock } from './usePhysicsClock';

/** Radians per second of the side-to-side cycle at speed 1. */
const SWEEP_RATE = 1.9;
const BAR = { width: 2.4, height: 0.8, depth: 0.35 };
/** Furthest the bar's centre travels from the middle of the track. */
const REACH = 0.8;

const barGeometry = new BoxGeometry(BAR.width, BAR.height, BAR.depth);
const railGeometry = new BoxGeometry(REACH * 2 + BAR.width, 0.04, 0.12);

function barX(angle: number, direction: number) {
  return direction * REACH * Math.sin(angle);
}

/** A wide bar sliding from wall to wall: slip through the gap it leaves behind. */
export function Sweeper({ z, speed, phase, direction }: ObstacleProps) {
  const body = useRef<RapierRigidBody>(null);

  usePhysicsClock((time) => {
    body.current?.setNextKinematicTranslation({
      x: barX(phase + speed * SWEEP_RATE * time, direction),
      y: BAR.height / 2,
      z,
    });
  });

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[barX(phase, direction), BAR.height / 2, z]}
      >
        <CuboidCollider args={[BAR.width / 2, BAR.height / 2, BAR.depth / 2]} restitution={0.4} />
        <mesh geometry={barGeometry} material={materials.obstacle} castShadow receiveShadow />
      </RigidBody>

      {/* Painted track showing where the bar slides. */}
      <mesh geometry={railGeometry} material={materials.obstacleHub} position={[0, 0.02, z]} receiveShadow />
    </>
  );
}
