import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import { materials } from '../materials';
import type { ObstacleProps } from './types';
import { usePhysicsClock } from './usePhysicsClock';

/** Radians per second at speed 1. */
const SPIN_RATE = 1.8;
const BAR = { length: 3.4, height: 0.35, depth: 0.28 };
const HUB = { radius: 0.28, height: 0.7 };
const HEIGHT = 0.3;

const barGeometry = new BoxGeometry(BAR.length, BAR.height, BAR.depth);
const hubGeometry = new CylinderGeometry(HUB.radius, HUB.radius, HUB.height, 6);
const UP = new Vector3(0, 1, 0);
const rotation = new Quaternion();

/** A bar spinning flat above the floor around a central hub. */
export function Spinner({ z, speed, phase, direction }: ObstacleProps) {
  const body = useRef<RapierRigidBody>(null);

  usePhysicsClock((time) => {
    rotation.setFromAxisAngle(UP, phase + direction * speed * SPIN_RATE * time);
    body.current?.setNextKinematicRotation(rotation);
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      name="spinner"
      colliders={false}
      position={[0, HEIGHT, z]}
      rotation={[0, phase, 0]}
    >
      <CuboidCollider args={[BAR.length / 2, BAR.height / 2, BAR.depth / 2]} restitution={0.5} />
      <CylinderCollider
        args={[HUB.height / 2, HUB.radius]}
        position={[0, HUB.height / 2 - HEIGHT, 0]}
      />
      <mesh geometry={barGeometry} material={materials.obstacle} castShadow receiveShadow />
      <mesh
        geometry={hubGeometry}
        material={materials.obstacleHub}
        position-y={HUB.height / 2 - HEIGHT}
        castShadow
        receiveShadow
      />
    </RigidBody>
  );
}
