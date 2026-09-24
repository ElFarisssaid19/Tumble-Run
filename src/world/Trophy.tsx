import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { useRef } from 'react';
import {
  CylinderGeometry,
  LatheGeometry,
  OctahedronGeometry,
  TorusGeometry,
  Vector2,
  type Group,
} from 'three';
import { materials } from './materials';
import { palette } from './palette';

const PEDESTAL_HEIGHT = 0.4;

// Half-silhouette of the cup (radius, height), spun around the Y axis with 8 facets.
const cupProfile = [
  [0, 0],
  [0.3, 0],
  [0.3, 0.07],
  [0.12, 0.14],
  [0.07, 0.24],
  [0.07, 0.44],
  [0.16, 0.52],
  [0.36, 0.64],
  [0.44, 0.86],
  [0.46, 1.04],
  [0.39, 1.04],
  [0.33, 0.8],
  [0, 0.74],
].map(([x, y]) => new Vector2(x, y));

const cupGeometry = new LatheGeometry(cupProfile, 8);
const handleGeometry = new TorusGeometry(0.2, 0.05, 4, 8, Math.PI);
const pedestalGeometry = new CylinderGeometry(0.5, 0.6, PEDESTAL_HEIGHT, 6);
const starGeometry = new OctahedronGeometry(0.13, 0);

/** Low-poly golden cup on a pedestal. The cup turns slowly and bobs to catch the eye. */
export function Trophy({ position }: { position: [number, number, number] }) {
  const cup = useRef<Group>(null);
  const star = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cup.current) {
      cup.current.rotation.y = t * 0.7;
      cup.current.position.y = PEDESTAL_HEIGHT + 0.06 + Math.sin(t * 1.8) * 0.05;
    }
    if (star.current) {
      star.current.rotation.y = -t * 1.6;
      star.current.position.y = PEDESTAL_HEIGHT + 1.45 + Math.sin(t * 1.8 + 1) * 0.08;
    }
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.75, 0.55]} position={[0, 0.75, 0]} restitution={0.4} />
      </RigidBody>

      <mesh
        geometry={pedestalGeometry}
        material={materials.pedestal}
        position-y={PEDESTAL_HEIGHT / 2}
        castShadow
        receiveShadow
      />
      <group ref={cup} position-y={PEDESTAL_HEIGHT}>
        <mesh geometry={cupGeometry} material={materials.trophy} castShadow />
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            geometry={handleGeometry}
            material={materials.trophy}
            position={[side * 0.4, 0.8, 0]}
            rotation-z={-side * (Math.PI / 2)}
            castShadow
          />
        ))}
      </group>
      <group ref={star}>
        <mesh geometry={starGeometry} material={materials.trophy} scale-y={1.4} />
      </group>
      <Sparkles
        count={30}
        scale={[1.8, 1.9, 1.8]}
        position-y={PEDESTAL_HEIGHT + 0.9}
        size={3.5}
        speed={0.35}
        noise={0.6}
        color={palette.trophy}
      />
    </group>
  );
}
