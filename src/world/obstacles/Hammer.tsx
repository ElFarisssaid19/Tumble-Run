import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry, CylinderGeometry, Quaternion, Vector3 } from 'three';
import { hammerAngle } from '../../game/motion';
import { merge, paint } from '../geometry';
import { HALF_BLOCK, WALL_HEIGHT, WALL_THICKNESS } from '../layout';
import { materials } from '../materials';
import { palette } from '../palette';
import type { ObstacleProps } from './types';
import { usePhysicsClock } from './usePhysicsClock';

const PIVOT_Y = 3.5;
/** At either end of the swing (HAMMER_SWING) the head is up beside the track, out of the way. */
const ARM = 2.9;
const HEAD = { width: 1, height: 0.75, depth: 0.9 };
/** The frame's posts stand in front of and behind the swing, clear of the head. */
const FRAME_X = HALF_BLOCK + WALL_THICKNESS / 2;
const FRAME_Z = 0.75;
const POST_HEIGHT = PIVOT_Y + 0.35 - WALL_HEIGHT;

const headGeometry = merge(
  paint(new BoxGeometry(HEAD.width, HEAD.height, HEAD.depth), palette.obstacle),
  paint(new BoxGeometry(HEAD.width + 0.04, 0.18, HEAD.depth + 0.04), palette.obstacleHub),
).translate(0, -ARM, 0);
const armGeometry = paint(new CylinderGeometry(0.07, 0.07, ARM, 6), palette.obstacleHub).translate(
  0,
  -ARM / 2,
  0,
);
const postGeometry = new BoxGeometry(0.24, POST_HEIGHT, 0.24);
const frameGeometry = merge(
  ...[-FRAME_Z, FRAME_Z].map((z) =>
    paint(new BoxGeometry(FRAME_X * 2 + 0.24, 0.24, 0.24), palette.obstacleHub).translate(
      0,
      PIVOT_Y + 0.25,
      z,
    ),
  ),
  paint(new CylinderGeometry(0.12, 0.12, FRAME_Z * 2, 8), palette.pole)
    .rotateX(Math.PI / 2)
    .translate(0, PIVOT_Y, 0),
);

const Z_AXIS = new Vector3(0, 0, 1);
const turn = new Quaternion();

/** A heavy head swinging across the track from a frame: roll through while it's up at a side. */
export function Hammer({ z, ...params }: ObstacleProps) {
  const body = useRef<RapierRigidBody>(null);

  usePhysicsClock((time) => {
    body.current?.setNextKinematicRotation(
      turn.setFromAxisAngle(Z_AXIS, hammerAngle(time, params)),
    );
  });

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        name="hammer"
        colliders={false}
        position={[0, PIVOT_Y, z]}
        rotation={[0, 0, hammerAngle(0, params)]}
      >
        <CuboidCollider
          args={[HEAD.width / 2, HEAD.height / 2, HEAD.depth / 2]}
          position-y={-ARM}
          restitution={0.6}
        />
        <mesh geometry={headGeometry} material={materials.props} castShadow receiveShadow />
        <mesh geometry={armGeometry} material={materials.props} castShadow />
      </RigidBody>

      <RigidBody type="fixed" colliders="cuboid" position={[0, WALL_HEIGHT + POST_HEIGHT / 2, z]}>
        {[-FRAME_X, FRAME_X].flatMap((x) =>
          [-FRAME_Z, FRAME_Z].map((dz) => (
            <mesh
              key={`${x}:${dz}`}
              geometry={postGeometry}
              material={materials.obstacleHub}
              position={[x, 0, dz]}
              castShadow
            />
          )),
        )}
      </RigidBody>
      <mesh geometry={frameGeometry} material={materials.props} position-z={z} castShadow />
    </>
  );
}
