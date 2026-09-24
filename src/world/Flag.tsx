import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  OctahedronGeometry,
  type Group,
} from 'three';
import { materials } from './materials';
import { palette } from './palette';

const POLE_HEIGHT = 1.5;
const CLOTH = { width: 0.75, height: 0.46 };
/** Height of the cloth's top edge on the pole, before and after the checkpoint is reached. */
const LOWERED = 0.6;
const RAISED = POLE_HEIGHT - 0.04;

const poleGeometry = new CylinderGeometry(0.045, 0.055, POLE_HEIGHT, 6);
const knobGeometry = new OctahedronGeometry(0.09, 0);
// A pennant: one triangle hanging from the pole and pointing along +X.
const clothGeometry = new BufferGeometry();
clothGeometry.setAttribute(
  'position',
  new Float32BufferAttribute([0, 0, 0, 0, -CLOTH.height, 0, CLOTH.width, -CLOTH.height / 2, 0], 3),
);
clothGeometry.computeVertexNormals();

/** A pennant on a pole: lowered and lilac until `raised`, then it runs up the pole and waves. */
export function Flag({
  position,
  raised,
}: {
  position: [number, number, number];
  raised: boolean;
}) {
  const cloth = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    const flag = cloth.current;
    if (!flag) return;
    const target = raised ? RAISED : LOWERED;
    flag.position.y += (target - flag.position.y) * (1 - Math.exp(-6 * delta));
    const t = clock.elapsedTime;
    flag.rotation.y = raised ? Math.sin(t * 5) * 0.3 : Math.sin(t * 1.3) * 0.08;
  });

  return (
    <group position={position}>
      <mesh
        geometry={poleGeometry}
        material={materials.pole}
        position-y={POLE_HEIGHT / 2}
        castShadow
      />
      <mesh geometry={knobGeometry} material={materials.trophy} position-y={POLE_HEIGHT + 0.06} />
      <group ref={cloth} position-y={LOWERED}>
        <mesh
          geometry={clothGeometry}
          material={raised ? materials.flagReached : materials.flag}
          castShadow
        />
      </group>
      {raised && (
        <Sparkles
          count={18}
          scale={[1.2, 1.1, 1.2]}
          position={[0.4, RAISED - 0.2, 0]}
          size={4}
          speed={0.5}
          color={palette.flagReached}
        />
      )}
    </group>
  );
}
