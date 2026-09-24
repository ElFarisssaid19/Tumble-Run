import {
  BallCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useEffect, useRef, type Ref } from 'react';
import { BufferAttribute, Color, IcosahedronGeometry, MeshStandardMaterial, type Mesh } from 'three';
import { FALL_LIMIT_Y } from '../game/config';
import { input } from '../game/input';
import { createRng } from '../game/rng';
import { gameStore } from '../game/store';
import { MARBLE_NAME, MARBLE_RADIUS, START_POSITION } from './layout';
import { palette } from './palette';

/** Handling. Accelerations are in m/s² so they don't depend on the marble's mass. */
const HANDLING = {
  /** Acceleration from rolling torque (needs grip, so it only really bites on the ground). */
  roll: 9,
  /** Direct push on the ground, for responsive steering. */
  push: 3,
  /** Direct push in the air: a little mid-air control. */
  airPush: 2.5,
  /** Upward speed given by a jump (m/s): clears the low walls and a lowered limbo bar. */
  jumpSpeed: 4.6,
  /** How far below the marble's bottom a surface still counts as ground (m). */
  groundTolerance: 0.08,
};

// Solid sphere: I = 2/5·m·r², so torque = 7/5·m·r·a gives acceleration `a` when rolling.
const ROLL_FACTOR = 1.4 * MARBLE_RADIUS;
const ZERO = { x: 0, y: 0, z: 0 };
const DOWN = { x: 0, y: -1, z: 0 };

const marbleGeometry = createFacetedBall();
const marbleMaterial = new MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.35,
  metalness: 0.1,
});

function respawn(body: RapierRigidBody) {
  body.setTranslation(START_POSITION, true);
  body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
  body.setLinvel(ZERO, true);
  body.setAngvel(ZERO, true);
}

/** The player: a dynamic ball driven by the shared input. */
export function Marble({ meshRef }: { meshRef?: Ref<Mesh> }) {
  const body = useRef<RapierRigidBody>(null);
  const { world, rapier } = useRapier();

  // Every restart puts the marble back on the start block.
  useEffect(
    () =>
      gameStore.subscribe((state, previous) => {
        if (state.run !== previous.run && body.current) respawn(body.current);
      }),
    [],
  );

  useBeforePhysicsStep(() => {
    const marble = body.current;
    if (!marble) return;

    const position = marble.translation();
    if (position.y < FALL_LIMIT_Y) {
      respawn(marble);
      gameStore.getState().fall();
      return;
    }

    const game = gameStore.getState();
    if (game.phase === 'ended') return;

    const now = performance.now();
    if (game.phase === 'ready' && input.isActive()) game.start(now);

    const groundHit = world.castRay(
      new rapier.Ray(position, DOWN),
      MARBLE_RADIUS + HANDLING.groundTolerance,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      marble,
    );
    const grounded = groundHit !== null;

    // Input y is "forward", which is -Z in the world.
    const { x, y } = input.move();
    const step = world.timestep * marble.mass();
    // Rolling towards (x, 0, -y) needs a torque around up × direction = (-y, 0, -x).
    const torque = HANDLING.roll * ROLL_FACTOR * step;
    marble.applyTorqueImpulse({ x: -y * torque, y: 0, z: -x * torque }, true);
    const push = (grounded ? HANDLING.push : HANDLING.airPush) * step;
    marble.applyImpulse({ x: x * push, y: 0, z: -y * push }, true);

    if (grounded && input.takeJump(now)) {
      const velocity = marble.linvel();
      marble.setLinvel({ x: velocity.x, y: HANDLING.jumpSpeed, z: velocity.z }, true);
    }
  });

  return (
    <RigidBody
      ref={body}
      name={MARBLE_NAME}
      colliders={false}
      position={[START_POSITION.x, START_POSITION.y, START_POSITION.z]}
      linearDamping={0.6}
      angularDamping={0.8}
      canSleep={false}
      ccd
    >
      <BallCollider args={[MARBLE_RADIUS]} friction={1} restitution={0.25} />
      <mesh ref={meshRef} geometry={marbleGeometry} material={marbleMaterial} castShadow />
    </RigidBody>
  );
}

/** Icosphere whose facets get slightly different shades, so you can see it roll. */
function createFacetedBall() {
  // Scaled up a touch: the flat facets sit inside the physical sphere otherwise.
  const geometry = new IcosahedronGeometry(MARBLE_RADIUS * 1.04, 1);
  const rng = createRng(7);
  const base = new Color(palette.marble);
  const shade = new Color();
  const vertexCount = geometry.getAttribute('position').count;
  const colors = new Float32Array(vertexCount * 3);

  for (let face = 0; face < vertexCount / 3; face++) {
    shade.copy(base).offsetHSL(rng.range(-0.02, 0.02), 0, rng.range(-0.07, 0.07));
    for (let corner = 0; corner < 3; corner++) shade.toArray(colors, (face * 3 + corner) * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}
