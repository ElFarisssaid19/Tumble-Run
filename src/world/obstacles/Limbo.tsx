import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry } from 'three';
import { HALF_BLOCK, WALL_HEIGHT, WALL_THICKNESS } from '../layout';
import { materials } from '../materials';
import type { ObstacleProps } from './types';
import { usePhysicsClock } from './usePhysicsClock';

/** Radians per second of the up-and-down cycle at speed 1. */
const CYCLE_RATE = 1.6;
const BAR = { length: HALF_BLOCK * 2 - 0.1, height: 0.3, depth: 0.3 };
/** Height range of the bar's centre: resting on the floor up to well above the marble. */
const LOW = BAR.height / 2;
const HIGH = 1.6;
// Posts rise from the wall tops to a little above the bar's highest point.
const POST = { size: 0.22, height: HIGH + BAR.height - WALL_HEIGHT + 0.3 };
const POST_X = HALF_BLOCK + WALL_THICKNESS / 2;

const barGeometry = new BoxGeometry(BAR.length, BAR.height, BAR.depth);
const postGeometry = new BoxGeometry(POST.size, POST.height, POST.size);

function barHeight(angle: number) {
  return LOW + ((HIGH - LOW) * (1 + Math.sin(angle))) / 2;
}

/** A full-width bar rising and falling: pass underneath while it is up, or hop it while down. */
export function Limbo({ z, speed, phase }: ObstacleProps) {
  const body = useRef<RapierRigidBody>(null);

  usePhysicsClock((time) => {
    body.current?.setNextKinematicTranslation({
      x: 0,
      y: barHeight(phase + speed * CYCLE_RATE * time),
      z,
    });
  });

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[0, barHeight(phase), z]}
      >
        <CuboidCollider args={[BAR.length / 2, BAR.height / 2, BAR.depth / 2]} restitution={0.3} />
        <mesh geometry={barGeometry} material={materials.obstacle} castShadow receiveShadow />
      </RigidBody>

      {/* Guide posts standing on the side walls. */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, WALL_HEIGHT + POST.height / 2, z]}>
        {[-POST_X, POST_X].map((x) => (
          <mesh
            key={x}
            geometry={postGeometry}
            material={materials.obstacleHub}
            position-x={x}
            castShadow
            receiveShadow
          />
        ))}
      </RigidBody>
    </>
  );
}
