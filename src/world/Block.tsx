import { CuboidCollider, RigidBody, type IntersectionEnterPayload } from '@react-three/rapier';
import type { ReactNode } from 'react';
import {
  DataTexture,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { BLOCK_SIZE } from '../game/config';
import { gameStore } from '../game/store';
import { useGame } from '../hooks/useGame';
import { Flag } from './Flag';
import {
  END_WALL_HEIGHT,
  FINISH_LINE_OFFSET,
  FLOOR_DEPTH,
  HALF_BLOCK,
  MARBLE_NAME,
  WALL_HEIGHT,
  WALL_THICKNESS,
} from './layout';
import { palette } from './palette';
import { Trophy } from './Trophy';

// The floor and walls of every block are drawn by Track.tsx; these are the extras on top.

const WALL_X = HALF_BLOCK + WALL_THICKNESS / 2;
const END_WALL_SPAN = END_WALL_HEIGHT + FLOOR_DEPTH;
const END_WALL_WIDTH = BLOCK_SIZE + WALL_THICKNESS * 2;
const END_WALL_Y = END_WALL_HEIGHT - END_WALL_SPAN / 2;

const lineGeometry = new PlaneGeometry(BLOCK_SIZE, 0.5);

const lineMaterial = new MeshStandardMaterial({
  color: palette.line,
  polygonOffset: true,
  polygonOffsetFactor: -1,
});
const checkerMaterial = new MeshStandardMaterial({
  map: createCheckerTexture(16, 2, palette.line, palette.lineDark),
  polygonOffset: true,
  polygonOffsetFactor: -1,
});

/** Groups a marker block's extras at its position. */
function At({ z, children }: { z: number; children: ReactNode }) {
  return <group position={[0, 0, z]}>{children}</group>;
}

function Line({ z, material = lineMaterial }: { z: number; material?: MeshStandardMaterial }) {
  return (
    <mesh
      geometry={lineGeometry}
      material={material}
      position={[0, 0, z]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    />
  );
}

/** First block: where the marble spawns, with a painted start line. */
export function StartBlock({ z }: { z: number }) {
  return (
    <At z={z}>
      <Line z={-1} />
    </At>
  );
}

/**
 * Obstacle-free rest block with a flag. Rolling onto it makes it the respawn point; the flag
 * runs up its pole once reached (the sound and HUD message come from the store change).
 */
export function CheckpointBlock({ z, id }: { z: number; id: number }) {
  const reached = useGame((state) => state.checkpoint !== null && state.checkpoint >= id);

  const onEnter = ({ other }: IntersectionEnterPayload) => {
    if (other.rigidBodyObject?.name === MARBLE_NAME) {
      gameStore.getState().reachCheckpoint(id);
    }
  };

  return (
    <At z={z}>
      <Line z={HALF_BLOCK - 0.5} />
      {/* Stands on the left wall, its pennant pointing over the track. */}
      <Flag position={[-WALL_X, WALL_HEIGHT, 0]} raised={reached} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          sensor
          args={[HALF_BLOCK, 1.5, HALF_BLOCK]}
          position={[0, 1.5, 0]}
          onIntersectionEnter={onEnter}
        />
      </RigidBody>
    </At>
  );
}

/**
 * Last block: checkered finish line, the trophy and a high wall behind it. Crossing the line
 * stops the clock.
 */
export function FinishBlock({ z }: { z: number }) {
  const onCross = ({ other }: IntersectionEnterPayload) => {
    if (other.rigidBodyObject?.name === MARBLE_NAME) {
      gameStore.getState().finish(performance.now());
    }
  };

  // The sensor covers the whole block beyond the line, up to well above the walls.
  const sensorDepth = HALF_BLOCK + FINISH_LINE_OFFSET;
  return (
    <At z={z}>
      <Line z={FINISH_LINE_OFFSET} material={checkerMaterial} />
      <Trophy position={[0, 0, -0.6]} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[END_WALL_WIDTH / 2, END_WALL_SPAN / 2, WALL_THICKNESS / 2]}
          position={[0, END_WALL_Y, -WALL_X]}
          restitution={0.35}
        />
        <CuboidCollider
          sensor
          args={[HALF_BLOCK, 1.5, sensorDepth / 2]}
          position={[0, 1.5, FINISH_LINE_OFFSET - sensorDepth / 2]}
          onIntersectionEnter={onCross}
        />
      </RigidBody>
    </At>
  );
}

function createCheckerTexture(columns: number, rows: number, colorA: string, colorB: string) {
  const [a, b] = [hexToRgba(colorA), hexToRgba(colorB)];
  const data = new Uint8Array(columns * rows * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      data.set((x + y) % 2 === 0 ? a : b, (y * columns + x) * 4);
    }
  }
  const texture = new DataTexture(data, columns, rows);
  texture.magFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function hexToRgba(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255);
}
