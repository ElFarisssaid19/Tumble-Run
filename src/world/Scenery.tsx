import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  type BufferGeometry,
  type Group,
} from 'three';
import { createRng } from '../game/rng';
import { flatMaterial } from './materials';
import { palette } from './palette';

const shapes: BufferGeometry[] = [
  new IcosahedronGeometry(1, 0),
  new OctahedronGeometry(1, 0),
  new DodecahedronGeometry(1, 0),
];
const tints = palette.scenery.map((color) => flatMaterial(color, { roughness: 1 }));

interface Floater {
  position: [number, number, number];
  scale: number;
  shape: BufferGeometry;
  tint: (typeof tints)[number];
  spin: number;
  bob: number;
}

/** The rocks start this far behind the start and run this far past the end of the course. */
const MARGIN_BEHIND = 10;
const MARGIN_BEYOND = 14;
/** Rocks per metre of backdrop. */
const DENSITY = 0.57;

/**
 * Decoration only (no physics). The fixed seed keeps the backdrop the same from one run to the
 * next; its extent follows the course length so it reaches past the finish of the longest level.
 */
function createFloaters(courseLength: number): Floater[] {
  const rng = createRng(20260924);
  const span = MARGIN_BEHIND + courseLength + MARGIN_BEYOND;
  return Array.from({ length: Math.round(span * DENSITY) }, (): Floater => {
    const side = rng.sign();
    return {
      position: [side * rng.range(5, 15), rng.range(-9, 3), MARGIN_BEHIND - rng.range(0, span)],
      scale: rng.range(0.4, 1.6),
      shape: shapes[rng.int(0, shapes.length - 1)] as BufferGeometry,
      tint: tints[rng.int(0, tints.length - 1)] as (typeof tints)[number],
      spin: rng.range(0.05, 0.25) * rng.sign(),
      bob: rng.range(0, Math.PI * 2),
    };
  });
}

/** Pastel low-poly rocks drifting around a course of `length` metres, fading into the fog. */
export function Scenery({ length }: { length: number }) {
  const group = useRef<Group>(null);
  const floaters = useMemo(() => createFloaters(length), [length]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    group.current?.children.forEach((child, i) => {
      const floater = floaters[i];
      if (!floater) return;
      child.rotation.set(t * floater.spin, t * floater.spin * 1.3, 0);
      child.position.y = floater.position[1] + Math.sin(t * 0.6 + floater.bob) * 0.25;
    });
  });

  return (
    <group ref={group}>
      {floaters.map((floater, i) => (
        <mesh
          key={i}
          geometry={floater.shape}
          material={floater.tint}
          position={floater.position}
          scale={floater.scale}
        />
      ))}
    </group>
  );
}
