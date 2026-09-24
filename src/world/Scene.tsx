import { Physics } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import type { Mesh } from 'three';
import { Course } from './Course';
import { FollowCamera } from './FollowCamera';
import { Lights } from './Lights';
import { Marble } from './Marble';
import { palette } from './palette';
import { Scenery } from './Scenery';

/** Everything inside the canvas. `onReady` fires once physics has loaded and the world is up. */
export function Scene({ onReady }: { onReady?: () => void }) {
  const marble = useRef<Mesh>(null);

  useEffect(() => onReady?.(), [onReady]);

  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fog attach="fog" args={[palette.sky, 14, 44]} />

      <Physics>
        <Course />
        <Marble meshRef={marble} />
      </Physics>

      <Lights target={marble} />
      <FollowCamera target={marble} />
      <Scenery />
    </>
  );
}
