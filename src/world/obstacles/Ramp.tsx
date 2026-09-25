import { ConvexHullCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { BoxGeometry, ExtrudeGeometry, Shape } from 'three';
import { FLOOR_DEPTH, HALF_BLOCK } from '../layout';
import { merge, paint } from '../geometry';
import { materials } from '../materials';
import { palette } from '../palette';
import type { ObstacleProps } from './types';

/**
 * Along the block (Z offsets from its centre, + towards the start): floor, then a ramp rising
 * from `foot` to the lip, a gap down to `landing`, and floor again to the block's end. At about
 * 4 m/s the marble clears the 1.4 m gap; slower, jump off the lip.
 */
const RAMP = { foot: 1.6, lip: 0.2, height: 0.42, landing: -1.2 } as const;
const WIDTH = HALF_BLOCK * 2;

const slope = new Shape()
  .moveTo(RAMP.foot, 0)
  .lineTo(RAMP.lip, RAMP.height)
  .lineTo(RAMP.lip, 0)
  .closePath();
const slopeAngle = Math.atan2(RAMP.height, RAMP.foot - RAMP.lip);

/** The wedge (extruded across the track), white chevrons on its slope and a pink lip. */
const rampGeometry = merge(
  paint(
    new ExtrudeGeometry(slope, { depth: WIDTH, bevelEnabled: false })
      .rotateY(-Math.PI / 2)
      .translate(HALF_BLOCK, 0, 0),
    palette.ramp,
  ),
  ...[0.3, 0.65].map((t) =>
    paint(new BoxGeometry(WIDTH * 0.8, 0.02, 0.18), palette.line)
      .rotateX(slopeAngle)
      .translate(0, RAMP.height * (1 - t) + 0.012, RAMP.lip + (RAMP.foot - RAMP.lip) * t),
  ),
  paint(new BoxGeometry(WIDTH, 0.05, 0.12), palette.obstacle).translate(
    0,
    RAMP.height,
    RAMP.lip + 0.06,
  ),
);

const entryLength = HALF_BLOCK - RAMP.lip;
const landingLength = RAMP.landing + HALF_BLOCK;
const entryGeometry = new BoxGeometry(WIDTH, FLOOR_DEPTH, entryLength);
const landingGeometry = new BoxGeometry(WIDTH, FLOOR_DEPTH, landingLength);
const entryZ = RAMP.lip + entryLength / 2;
const landingZ = RAMP.landing - landingLength / 2;

// The wedge's six corners, for an exact convex collider.
const hull = [RAMP.foot, RAMP.lip]
  .flatMap((z) => [-HALF_BLOCK, HALF_BLOCK].map((x) => [x, 0, z]))
  .concat([-HALF_BLOCK, HALF_BLOCK].map((x) => [x, RAMP.height, RAMP.lip]))
  .flat();

/** A jump: a ramp, a gap with nothing below, and a short landing strip. */
export function Ramp({ z }: ObstacleProps) {
  return (
    <group position={[0, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[HALF_BLOCK, FLOOR_DEPTH / 2, entryLength / 2]}
          position={[0, -FLOOR_DEPTH / 2, entryZ]}
          friction={1}
        />
        <CuboidCollider
          args={[HALF_BLOCK, FLOOR_DEPTH / 2, landingLength / 2]}
          position={[0, -FLOOR_DEPTH / 2, landingZ]}
          friction={1}
        />
        <ConvexHullCollider args={[hull]} friction={0.6} />
      </RigidBody>
      <mesh
        geometry={entryGeometry}
        material={materials.ramp}
        position={[0, -FLOOR_DEPTH / 2, entryZ]}
        receiveShadow
      />
      <mesh
        geometry={landingGeometry}
        material={materials.ramp}
        position={[0, -FLOOR_DEPTH / 2, landingZ]}
        receiveShadow
      />
      <mesh geometry={rampGeometry} material={materials.props} castShadow receiveShadow />
    </group>
  );
}
