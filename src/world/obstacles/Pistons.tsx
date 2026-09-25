import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry } from 'three';
import { pistonExtension } from '../../game/motion';
import { merge, paint } from '../geometry';
import { HALF_BLOCK, WALL_THICKNESS } from '../layout';
import { materials } from '../materials';
import { palette } from '../palette';
import type { ObstacleProps } from './types';
import { usePhysicsClock } from './usePhysicsClock';

const PUSHER = { width: 1.8, height: 0.8, depth: 0.8 };
/** How far a pusher's face travels out of its wall: just past the middle of the track. */
const REACH = 2.3;
/** The two pushers sit this far before and after the block's centre. */
const ROW = 0.9;
/** Boxes outside the walls that hide a retracted pusher. */
const HOUSING = { width: 1.7, height: 1, depth: 1 };

// The darker plate is the face that pushes (+X here; mirrored for the right wall).
const pusherGeometry = merge(
  paint(new BoxGeometry(PUSHER.width, PUSHER.height, PUSHER.depth), palette.obstacle),
  paint(
    new BoxGeometry(0.1, PUSHER.height + 0.04, PUSHER.depth + 0.04),
    palette.obstacleHub,
  ).translate(PUSHER.width / 2, 0, 0),
);
const housingGeometry = new BoxGeometry(HOUSING.width, HOUSING.height, HOUSING.depth);

/** Centre X of a pusher coming out of the wall on `side` (-1 left, 1 right). */
function pusherX(side: number, extension: number) {
  return side * (HALF_BLOCK + PUSHER.width / 2 - REACH * extension);
}

/**
 * Two blocks punching out of opposite walls in turn, one before and one after the block's
 * centre: time them, or weave between the rows on the side each one can't reach.
 */
export function Pistons({ z, direction, ...motion }: ObstacleProps) {
  return (
    <>
      <Pusher z={z + ROW} side={direction} motion={motion} second={false} />
      <Pusher z={z - ROW} side={-direction} motion={motion} second />
    </>
  );
}

interface PusherProps {
  z: number;
  side: number;
  motion: { speed: number; phase: number };
  second: boolean;
}

function Pusher({ z, side, motion, second }: PusherProps) {
  const body = useRef<RapierRigidBody>(null);
  const x = (time: number) => pusherX(side, pistonExtension(time, motion, second));

  usePhysicsClock((time) => {
    body.current?.setNextKinematicTranslation({ x: x(time), y: PUSHER.height / 2, z });
  });

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        name="pusher"
        colliders={false}
        position={[x(0), PUSHER.height / 2, z]}
      >
        <CuboidCollider
          args={[PUSHER.width / 2, PUSHER.height / 2, PUSHER.depth / 2]}
          restitution={0.3}
        />
        <mesh
          geometry={pusherGeometry}
          material={materials.props}
          scale-x={-side}
          castShadow
          receiveShadow
        />
      </RigidBody>
      <mesh
        geometry={housingGeometry}
        material={materials.obstacleHub}
        position={[
          side * (HALF_BLOCK + WALL_THICKNESS + HOUSING.width / 2),
          HOUSING.height / 2 - 0.15,
          z,
        ]}
        castShadow
        receiveShadow
      />
    </>
  );
}
