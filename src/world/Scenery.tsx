import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  type BufferGeometry,
  type Group,
} from 'three';
import { BLOCK_SIZE, OBSTACLE_COUNT } from '../game/config';
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

// Decoration only (no physics): fixed seed, so the backdrop is the same on every course.
const floaters: Floater[] = (() => {
  const rng = createRng(20260924);
  const courseLength = (OBSTACLE_COUNT + 2) * BLOCK_SIZE;
  return Array.from({ length: 34 }, (): Floater => {
    const side = rng.sign();
    return {
      position: [side * rng.range(5, 15), rng.range(-9, 3), rng.range(-courseLength - 14, 10)],
      scale: rng.range(0.4, 1.6),
      shape: shapes[rng.int(0, shapes.length - 1)] as BufferGeometry,
      tint: tints[rng.int(0, tints.length - 1)] as (typeof tints)[number],
      spin: rng.range(0.05, 0.25) * rng.sign(),
      bob: rng.range(0, Math.PI * 2),
    };
  });
})();

/** Pastel low-poly rocks drifting around the course and fading into the fog. */
export function Scenery() {
  const group = useRef<Group>(null);

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
