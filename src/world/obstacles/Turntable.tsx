import {
  CylinderCollider,
  RigidBody,
  RoundCylinderCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import { turntableAngle } from '../../game/motion';
import { merge, paint } from '../geometry';
import { materials } from '../materials';
import { palette } from '../palette';
import type { ObstacleProps } from './types';
import { usePhysicsClock } from './usePhysicsClock';

/** A low disc with a rounded rim (so the marble rolls on), its top 6 cm above the floor. */
const DISC = { radius: 1.85, top: 0.06, rim: 0.035 };
/** Three pegs standing on the disc and turning with it. */
const PEG = { radius: 0.22, height: 0.6, orbit: 1.05, count: 3 };

const discGeometry = merge(
  paint(new CylinderGeometry(DISC.radius, DISC.radius, DISC.top * 2, 24), palette.disc),
  // A painted stripe from the centre to the rim shows which way it turns.
  paint(
    new BoxGeometry(DISC.radius - 0.1, DISC.top * 2 + 0.01, 0.16),
    palette.obstacleHub,
  ).translate((DISC.radius - 0.1) / 2, 0, 0),
);
const pegGeometry = merge(
  ...Array.from({ length: PEG.count }, (_, i) => {
    const angle = (i / PEG.count) * Math.PI * 2;
    const x = Math.cos(angle) * PEG.orbit;
    const z = Math.sin(angle) * PEG.orbit;
    return [
      paint(
        new CylinderGeometry(PEG.radius, PEG.radius, PEG.height, 8),
        palette.obstacle,
      ).translate(x, DISC.top + PEG.height / 2, z),
      paint(
        new CylinderGeometry(PEG.radius + 0.03, PEG.radius + 0.03, 0.08, 8),
        palette.bumperCap,
      ).translate(x, DISC.top + PEG.height, z),
    ];
  }).flat(),
);

const Y_AXIS = new Vector3(0, 1, 0);
const turn = new Quaternion();

/**
 * A turning disc that carries the marble sideways, with pegs riding on it: aim ahead of where
 * you want to go and slip between the pegs.
 */
export function Turntable({ z, ...params }: ObstacleProps) {
  const body = useRef<RapierRigidBody>(null);

  usePhysicsClock((time) => {
    body.current?.setNextKinematicRotation(
      turn.setFromAxisAngle(Y_AXIS, turntableAngle(time, params)),
    );
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      name="turntable"
      colliders={false}
      position={[0, 0, z]}
      rotation={[0, turntableAngle(0, params), 0]}
    >
      <RoundCylinderCollider
        args={[DISC.top - DISC.rim, DISC.radius - DISC.rim, DISC.rim]}
        friction={0.9}
        restitution={0.1}
      />
      {Array.from({ length: PEG.count }, (_, i) => {
        const angle = (i / PEG.count) * Math.PI * 2;
        return (
          <CylinderCollider
            key={i}
            args={[PEG.height / 2, PEG.radius]}
            position={[
              Math.cos(angle) * PEG.orbit,
              DISC.top + PEG.height / 2,
              Math.sin(angle) * PEG.orbit,
            ]}
            restitution={0.5}
          />
        );
      })}
      <mesh geometry={discGeometry} material={materials.props} receiveShadow />
      <mesh geometry={pegGeometry} material={materials.props} castShadow />
    </RigidBody>
  );
}
