import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import { Vector3, type DirectionalLight, type Object3D } from 'three';
import { palette } from './palette';

/** Where the sun sits relative to the marble: high, to the left and slightly behind the camera. */
const SUN_OFFSET = new Vector3(-3, 9, 3);
/** Half-size of the area around the marble that receives shadows. */
const SHADOW_REACH = 7;

const focus = new Vector3();

/**
 * Soft sky fill plus a warm sun. The sun (and its shadow camera) travels with the marble, so a
 * small, sharp-enough shadow map covers the part of the course that matters.
 */
export function Lights({ target }: { target: RefObject<Object3D | null> }) {
  const sun = useRef<DirectionalLight>(null);

  useFrame(() => {
    const light = sun.current;
    const object = target.current;
    if (!light || !object) return;

    object.getWorldPosition(focus);
    light.position.copy(focus).add(SUN_OFFSET);
    light.target.position.copy(focus);
    light.target.updateMatrixWorld();
  });

  return (
    <>
      <hemisphereLight args={[palette.skyBounce, palette.groundBounce, 2.2]} />
      <directionalLight
        ref={sun}
        color={palette.sunlight}
        intensity={1.7}
        position={SUN_OFFSET}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-SHADOW_REACH}
        shadow-camera-right={SHADOW_REACH}
        shadow-camera-top={SHADOW_REACH}
        shadow-camera-bottom={-SHADOW_REACH}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-radius={6}
        shadow-intensity={0.55}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
    </>
  );
}
