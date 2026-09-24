import {
  CuboidCollider,
  RigidBody,
  type IntersectionEnterPayload,
} from '@react-three/rapier';
import type { ReactNode } from 'react';
import {
  BoxGeometry,
  DataTexture,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  SRGBColorSpace,
  type Material,
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
import { materials } from './materials';
import { palette } from './palette';
import { Trophy } from './Trophy';

const WALL_X = HALF_BLOCK + WALL_THICKNESS / 2;
const WALL_SPAN = WALL_HEIGHT + FLOOR_DEPTH;
const WALL_Y = WALL_HEIGHT - WALL_SPAN / 2;
const END_WALL_SPAN = END_WALL_HEIGHT + FLOOR_DEPTH;
const END_WALL_WIDTH = BLOCK_SIZE + WALL_THICKNESS * 2;
const END_WALL_Y = END_WALL_HEIGHT - END_WALL_SPAN / 2;

const floorGeometry = new BoxGeometry(BLOCK_SIZE, FLOOR_DEPTH, BLOCK_SIZE);
const wallGeometry = new BoxGeometry(WALL_THICKNESS, WALL_SPAN, BLOCK_SIZE);
const endWallGeometry = new BoxGeometry(END_WALL_WIDTH, END_WALL_SPAN, WALL_THICKNESS);
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

interface BlockProps {
  z: number;
  material: Material;
  /** Closes the far end of the block (used by the last block). */
  endWall?: boolean;
  /** Extra content, positioned relative to the block centre. */
  children?: ReactNode;
}

/**
 * A 4×4 floor tile with a low wall on each side. Tiles are visual only: the course builder adds
 * one continuous collider under the whole track so the marble never bumps on tile seams.
 */
export function Block({ z, material, endWall = false, children }: BlockProps) {
  return (
    <group position={[0, 0, z]}>
      <mesh
        geometry={floorGeometry}
        material={material}
        position={[0, -FLOOR_DEPTH / 2, 0]}
        receiveShadow
      />
      {[-WALL_X, WALL_X].map((x) => (
        <mesh
          key={x}
          geometry={wallGeometry}
          material={materials.wall}
          position={[x, WALL_Y, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {endWall && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[END_WALL_WIDTH / 2, END_WALL_SPAN / 2, WALL_THICKNESS / 2]}
            position={[0, END_WALL_Y, -WALL_X]}
            restitution={0.35}
          />
          <mesh
            geometry={endWallGeometry}
            material={materials.wall}
            position={[0, END_WALL_Y, -WALL_X]}
            castShadow
            receiveShadow
          />
        </RigidBody>
      )}
      {children}
    </group>
  );
}

/** Colliders for the floor and side walls of `length` metres of track, as single pieces. */
export function TrackColliders({ length }: { length: number }) {
  const half = length / 2;
  // The track starts at the back edge of the start block and runs along -Z.
  const centerZ = HALF_BLOCK - half;
  return (
    <RigidBody type="fixed" colliders={false} position={[0, 0, centerZ]}>
      <CuboidCollider
        args={[HALF_BLOCK, FLOOR_DEPTH / 2, half]}
        position={[0, -FLOOR_DEPTH / 2, 0]}
        friction={1}
        restitution={0.2}
      />
      {[-WALL_X, WALL_X].map((x) => (
        <CuboidCollider
          key={x}
          args={[WALL_THICKNESS / 2, WALL_SPAN / 2, half]}
          position={[x, WALL_Y, 0]}
          friction={0.3}
          restitution={0.35}
        />
      ))}
    </RigidBody>
  );
}

/** First block: where the marble spawns, with a painted start line. */
export function StartBlock({ z }: { z: number }) {
  return (
    <Block z={z} material={materials.start}>
      <mesh
        geometry={lineGeometry}
        material={lineMaterial}
        position={[0, 0, -1]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      />
    </Block>
  );
}

/** Plain block that an obstacle sits on; tiles alternate between two tints. */
export function ObstacleBlock({ z, index }: { z: number; index: number }) {
  return <Block z={z} material={index % 2 === 0 ? materials.tileA : materials.tileB} />;
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
    <Block z={z} material={materials.checkpoint}>
      <mesh
        geometry={lineGeometry}
        material={lineMaterial}
        position={[0, 0, HALF_BLOCK - 0.5]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      />
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
    </Block>
  );
}

/** Last block: checkered finish line and the trophy. Crossing the line stops the clock. */
export function FinishBlock({ z }: { z: number }) {
  const onCross = ({ other }: IntersectionEnterPayload) => {
    if (other.rigidBodyObject?.name === MARBLE_NAME) {
      gameStore.getState().finish(performance.now());
    }
  };

  // The sensor covers the whole block beyond the line, up to well above the walls.
  const sensorDepth = HALF_BLOCK + FINISH_LINE_OFFSET;
  return (
    <Block z={z} material={materials.finish} endWall>
      <mesh
        geometry={lineGeometry}
        material={checkerMaterial}
        position={[0, 0, FINISH_LINE_OFFSET]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      />
      <Trophy position={[0, 0, -0.6]} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          sensor
          args={[HALF_BLOCK, 1.5, sensorDepth / 2]}
          position={[0, 1.5, FINISH_LINE_OFFSET - sensorDepth / 2]}
          onIntersectionEnter={onCross}
        />
      </RigidBody>
    </Block>
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
