import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import { BoxGeometry, ConeGeometry, Quaternion, Vector3, type BufferGeometry } from 'three';
import { BLOCK_SIZE, BRIDGE_WIDTH } from '../game/config';
import type { BridgeSpec } from '../game/course';
import { drawbridgeLift } from '../game/motion';
import { merge, paint } from './geometry';
import { materials } from './materials';
import { usePhysicsClock } from './obstacles/usePhysicsClock';
import { palette } from './palette';

/** The deck's top is level with the floor on either side (y = 0). */
const DECK_THICKNESS = 0.25;
const PLANK = 0.46;
const PLANK_GAP = 0.04;
/** Rails of the railed bridge: low, so a careless jump can still take you over. */
const RAIL_HEIGHT = 0.45;
/** Lantern posts at the four corners, so a bridge reads from far down the course. */
const POST = { size: 0.12, height: 1.25 };
const POST_Z = BLOCK_SIZE / 2 - 0.15;

/** Wooden planks across the gap, with two beams underneath. */
function deckGeometry(width: number, length: number): BufferGeometry {
  const count = Math.round(length / (PLANK + PLANK_GAP));
  const planks = Array.from({ length: count }, (_, i) =>
    paint(new BoxGeometry(width, DECK_THICKNESS, PLANK), palette.deck).translate(
      0,
      -DECK_THICKNESS / 2,
      -length / 2 + (i + 0.5) * (length / count),
    ),
  );
  const beams = [-1, 1].map((side) =>
    paint(new BoxGeometry(0.14, 0.2, length), palette.deckEdge).translate(
      side * (width / 2 - 0.2),
      -DECK_THICKNESS - 0.08,
      0,
    ),
  );
  return merge(...planks, ...beams);
}

function postsGeometry(width: number): BufferGeometry {
  const x = width / 2 + POST.size;
  return merge(
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        paint(new BoxGeometry(POST.size, POST.height, POST.size), palette.rail).translate(
          sx * x,
          POST.height / 2 - DECK_THICKNESS,
          sz * POST_Z,
        ),
      ),
    ),
  );
}

function lanternsGeometry(width: number, height: number): BufferGeometry {
  const x = width / 2 + POST.size;
  return merge(
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        new BoxGeometry(0.24, 0.24, 0.24).translate(sx * x, height, sz * POST_Z).toNonIndexed(),
      ),
    ),
  );
}

function railsGeometry(width: number): BufferGeometry {
  const x = width / 2 + 0.04;
  const balusters = Math.round(BLOCK_SIZE / 0.8);
  return merge(
    ...[-1, 1].flatMap((side) => [
      paint(new BoxGeometry(0.08, 0.08, BLOCK_SIZE), palette.rail).translate(
        side * x,
        RAIL_HEIGHT,
        0,
      ),
      paint(new BoxGeometry(0.06, 0.06, BLOCK_SIZE), palette.rail).translate(side * x, 0.22, 0),
      ...Array.from({ length: balusters }, (_, i) =>
        paint(new BoxGeometry(0.07, RAIL_HEIGHT, 0.07), palette.deckEdge).translate(
          side * x,
          RAIL_HEIGHT / 2,
          -BLOCK_SIZE / 2 + (i + 0.5) * (BLOCK_SIZE / balusters),
        ),
      ),
    ]),
  );
}

/** Towers at both ends of a drawbridge: two posts with pointed roofs on each side. */
function towersGeometry(width: number): BufferGeometry {
  const x = width / 2 + 0.25;
  return merge(
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].flatMap((sz) => [
        paint(new BoxGeometry(0.34, 2, 0.34), palette.pedestal).translate(
          sx * x,
          0.75,
          sz * POST_Z,
        ),
        paint(new ConeGeometry(0.34, 0.5, 4), palette.obstacle)
          .rotateY(Math.PI / 4)
          .translate(sx * x, 2, sz * POST_Z),
      ]),
    ),
  );
}

// Built once per bridge kind: every bridge of a kind shares them.
const WIDTH = BRIDGE_WIDTH;
const geometries = {
  railed: {
    deck: deckGeometry(WIDTH.railed, BLOCK_SIZE),
    posts: postsGeometry(WIDTH.railed),
    lanterns: lanternsGeometry(WIDTH.railed, POST.height - DECK_THICKNESS + 0.1),
    rails: railsGeometry(WIDTH.railed),
  },
  open: {
    deck: deckGeometry(WIDTH.open, BLOCK_SIZE),
    posts: postsGeometry(WIDTH.open),
    lanterns: lanternsGeometry(WIDTH.open, POST.height - DECK_THICKNESS + 0.1),
  },
  drawbridge: {
    leaf: deckGeometry(WIDTH.drawbridge, BLOCK_SIZE / 2),
    towers: towersGeometry(WIDTH.drawbridge),
    lanterns: lanternsGeometry(WIDTH.drawbridge + 0.26, 2.35),
  },
};

/**
 * A bridge over a block-long gap. There is no floor below: rolling off the deck means a fall,
 * and a respawn at the last checkpoint.
 */
export function Bridge({ z, spec }: { z: number; spec: BridgeSpec }) {
  switch (spec.kind) {
    case 'railed':
      return <FixedBridge z={z} width={WIDTH.railed} geometry={geometries.railed} railed />;
    case 'open':
      return <FixedBridge z={z} width={WIDTH.open} geometry={geometries.open} />;
    case 'drawbridge':
      return <Drawbridge z={z} spec={spec} />;
  }
}

function FixedBridge({
  z,
  width,
  geometry,
  railed = false,
}: {
  z: number;
  width: number;
  geometry: {
    deck: BufferGeometry;
    posts: BufferGeometry;
    lanterns: BufferGeometry;
    rails?: BufferGeometry;
  };
  railed?: boolean;
}) {
  return (
    <group position={[0, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[width / 2, DECK_THICKNESS / 2, BLOCK_SIZE / 2]}
          position-y={-DECK_THICKNESS / 2}
          friction={1}
          restitution={0.2}
        />
        {railed &&
          [-1, 1].map((side) => (
            <CuboidCollider
              key={side}
              args={[0.05, RAIL_HEIGHT / 2 + 0.03, BLOCK_SIZE / 2]}
              position={[side * (width / 2 + 0.04), RAIL_HEIGHT / 2, 0]}
              restitution={0.3}
            />
          ))}
      </RigidBody>
      <mesh geometry={geometry.deck} material={materials.props} castShadow receiveShadow />
      {geometry.rails && <mesh geometry={geometry.rails} material={materials.props} castShadow />}
      <mesh geometry={geometry.posts} material={materials.props} castShadow />
      <mesh geometry={geometry.lanterns} material={materials.lantern} />
    </group>
  );
}

const X_AXIS = new Vector3(1, 0, 0);
const turn = new Quaternion();

/** Two leaves hinged at the block's ends that lift up together, opening the gap between them. */
function Drawbridge({ z, spec }: { z: number; spec: BridgeSpec }) {
  const near = useRef<RapierRigidBody>(null);
  const far = useRef<RapierRigidBody>(null);
  const width = WIDTH.drawbridge;

  usePhysicsClock((time) => {
    const lift = drawbridgeLift(time, spec);
    // The near leaf lies towards -Z from its hinge, the far one towards +Z: opposite turns.
    near.current?.setNextKinematicRotation(turn.setFromAxisAngle(X_AXIS, lift));
    far.current?.setNextKinematicRotation(turn.setFromAxisAngle(X_AXIS, -lift));
  });

  const start = drawbridgeLift(0, spec);
  return (
    <group position={[0, 0, z]}>
      {(
        [
          [near, 1, start],
          [far, -1, -start],
        ] as const
      ).map(([ref, side, angle]) => (
        <RigidBody
          key={side}
          ref={ref}
          type="kinematicPosition"
          name="drawbridge-leaf"
          colliders={false}
          position={[0, 0, (side * BLOCK_SIZE) / 2]}
          rotation={[angle, 0, 0]}
        >
          <CuboidCollider
            args={[width / 2, DECK_THICKNESS / 2, BLOCK_SIZE / 4]}
            position={[0, -DECK_THICKNESS / 2, (-side * BLOCK_SIZE) / 4]}
            friction={1}
            restitution={0.2}
          />
          <mesh
            geometry={geometries.drawbridge.leaf}
            material={materials.props}
            position-z={(-side * BLOCK_SIZE) / 4}
            castShadow
            receiveShadow
          />
        </RigidBody>
      ))}
      <mesh geometry={geometries.drawbridge.towers} material={materials.props} castShadow />
      <mesh geometry={geometries.drawbridge.lanterns} material={materials.lantern} />
    </group>
  );
}
