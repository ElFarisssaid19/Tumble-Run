import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, Matrix4, type BufferGeometry, type InstancedMesh } from 'three';
import { BLOCK_SIZE } from '../game/config';
import { blockRuns, blockZ, hasSolidFloor, hasWalls, type Course } from '../game/course';
import { themeMix } from '../game/zones';
import { END_WALL_HEIGHT, FLOOR_DEPTH, HALF_BLOCK, WALL_HEIGHT, WALL_THICKNESS } from './layout';
import { materials } from './materials';
import { palette } from './palette';
import { mixColor } from './themes';

const WALL_X = HALF_BLOCK + WALL_THICKNESS / 2;
const WALL_SPAN = WALL_HEIGHT + FLOOR_DEPTH;
const WALL_Y = WALL_HEIGHT - WALL_SPAN / 2;
const END_WALL_SPAN = END_WALL_HEIGHT + FLOOR_DEPTH;
const END_WALL_Y = END_WALL_HEIGHT - END_WALL_SPAN / 2;

const floorGeometry = new BoxGeometry(BLOCK_SIZE, FLOOR_DEPTH, BLOCK_SIZE);
const wallGeometry = new BoxGeometry(WALL_THICKNESS, WALL_SPAN, BLOCK_SIZE);
const endWallGeometry = new BoxGeometry(
  BLOCK_SIZE + WALL_THICKNESS * 2,
  END_WALL_SPAN,
  WALL_THICKNESS,
);

/** Marker tiles keep their colour in every zone, so start, checkpoints and finish always read. */
const MARKER_TILES = {
  start: palette.start,
  checkpoint: palette.checkpoint,
  finish: palette.finish,
};

interface Piece {
  position: [number, number, number];
  color: Color;
}

/**
 * The floor and side walls of the whole course: one instanced mesh each (a few draw calls for
 * any course length), tinted per block with its zone's colours, blended across zone borders.
 * Physics gets one floor and two wall colliders per unbroken run, so the marble never bumps on
 * tile seams; bridges and ramps bring their own floor.
 */
export function Track({ course }: { course: Course }) {
  const { floors, walls, endWall, floorRuns, wallRuns } = useMemo(() => layOut(course), [course]);

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {floorRuns.map(([first, last]) => (
          <CuboidCollider
            key={`floor-${first}`}
            args={[HALF_BLOCK, FLOOR_DEPTH / 2, ((last - first + 1) * BLOCK_SIZE) / 2]}
            position={[0, -FLOOR_DEPTH / 2, (blockZ(first) + blockZ(last)) / 2]}
            friction={1}
            restitution={0.2}
          />
        ))}
        {wallRuns.flatMap(([first, last]) =>
          [-WALL_X, WALL_X].map((x) => (
            <CuboidCollider
              key={`wall-${first}-${x}`}
              args={[WALL_THICKNESS / 2, WALL_SPAN / 2, ((last - first + 1) * BLOCK_SIZE) / 2]}
              position={[x, WALL_Y, (blockZ(first) + blockZ(last)) / 2]}
              friction={0.3}
              restitution={0.35}
            />
          )),
        )}
      </RigidBody>

      <Pieces geometry={floorGeometry} pieces={floors} receiveShadow />
      <Pieces geometry={wallGeometry} pieces={walls} castShadow receiveShadow />
      <Pieces geometry={endWallGeometry} pieces={endWall} castShadow receiveShadow />
    </>
  );
}

function layOut(course: Course) {
  const themes = course.zones.map((zone) => zone.theme);
  const tint = (z: number, key: 'tileA' | 'tileB' | 'wall') =>
    mixColor(themes, themeMix(course.zones, z), key, new Color());

  const floors: Piece[] = [];
  const walls: Piece[] = [];
  for (const block of course.blocks) {
    if (hasSolidFloor(block)) {
      const marker =
        block.type === 'start' || block.type === 'checkpoint' || block.type === 'finish'
          ? MARKER_TILES[block.type]
          : undefined;
      floors.push({
        position: [0, -FLOOR_DEPTH / 2, block.z],
        color: marker ? new Color(marker) : tint(block.z, block.index % 2 ? 'tileB' : 'tileA'),
      });
    }
    if (hasWalls(block)) {
      const color = tint(block.z, 'wall');
      walls.push({ position: [-WALL_X, WALL_Y, block.z], color });
      walls.push({ position: [WALL_X, WALL_Y, block.z], color });
    }
  }

  const finishZ = blockZ(course.blocks.length - 1);
  const endWall: Piece[] = [
    { position: [0, END_WALL_Y, finishZ - WALL_X], color: tint(finishZ, 'wall') },
  ];

  return {
    floors,
    walls,
    endWall,
    floorRuns: blockRuns(course, hasSolidFloor),
    wallRuns: blockRuns(course, hasWalls),
  };
}

const matrix = new Matrix4();

/** Copies of one geometry, placed and tinted per piece, drawn in a single call. */
function Pieces({
  geometry,
  pieces,
  castShadow = false,
  receiveShadow = false,
}: {
  geometry: BufferGeometry;
  pieces: readonly Piece[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    pieces.forEach(({ position, color }, i) => {
      instances.setMatrixAt(i, matrix.makeTranslation(...position));
      instances.setColorAt(i, color);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    // Culling uses the bounds of all the instances, not of one tile at the origin.
    instances.computeBoundingSphere();
  }, [pieces]);

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, materials.tinted, pieces.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}
