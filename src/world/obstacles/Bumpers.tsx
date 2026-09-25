import { useFrame } from '@react-three/fiber';
import { CoefficientCombineRule, CylinderCollider, RigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { CylinderGeometry, type Group } from 'three';
import { materials } from '../materials';
import type { ObstacleProps } from './types';

const BUMPER = { radius: 0.38, height: 0.5 };
/**
 * A triangle of bumpers (x, and distance from the block's centre towards the start), flipped
 * end to end by `direction`: a short slalom with a gap in each row wide enough to roll through.
 */
const BUMPER_LAYOUT = [
  [-1, 0.9],
  [1, 0.9],
  [0, -0.7],
] as const;
/**
 * A lively but fair bounce: the marble leaves as fast as it came in (the Max rule ignores the
 * marble's own, softer restitution). More than 1 kicked it back off the bridges they can follow.
 */
const BOUNCE = 1;

const bodyGeometry = new CylinderGeometry(BUMPER.radius, BUMPER.radius * 1.08, BUMPER.height, 10);
const capGeometry = new CylinderGeometry(BUMPER.radius * 0.72, BUMPER.radius * 0.72, 0.1, 10);

/** Static pinball bumpers that kick the marble away and flash when hit. */
export function Bumpers({ z, direction }: ObstacleProps) {
  return BUMPER_LAYOUT.map(([x, dz]) => (
    <Bumper key={`${x}:${dz}`} position={[x, 0, z + dz * direction]} />
  ));
}

function Bumper({ position }: { position: [number, number, number] }) {
  const cap = useRef<Group>(null);
  const hitAt = useRef(-Infinity);

  useFrame(() => {
    if (!cap.current) return;
    const pop = Math.exp(-(performance.now() / 1000 - hitAt.current) * 9);
    cap.current.scale.setScalar(1 + pop * 0.35);
  });

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CylinderCollider
        args={[BUMPER.height / 2, BUMPER.radius]}
        position-y={BUMPER.height / 2}
        restitution={BOUNCE}
        restitutionCombineRule={CoefficientCombineRule.Max}
        onCollisionEnter={() => {
          hitAt.current = performance.now() / 1000;
        }}
      />
      <mesh
        geometry={bodyGeometry}
        material={materials.bumper}
        position-y={BUMPER.height / 2}
        castShadow
        receiveShadow
      />
      <group ref={cap} position-y={BUMPER.height}>
        <mesh geometry={capGeometry} material={materials.bumperCap} />
      </group>
    </RigidBody>
  );
}
