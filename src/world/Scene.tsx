import { Physics } from '@react-three/rapier';
import { useEffect, useRef } from 'react';
import type { Mesh } from 'three';
import { useGame } from '../hooks/useGame';
import { Course } from './Course';
import { FollowCamera } from './FollowCamera';
import { Lights } from './Lights';
import { Marble } from './Marble';
import { Scenery } from './Scenery';

/** Everything inside the canvas. `onReady` fires once physics has loaded and the world is up. */
export function Scene({ onReady }: { onReady?: () => void }) {
  const marble = useRef<Mesh>(null);
  const course = useGame((state) => state.course);

  useEffect(() => onReady?.(), [onReady]);

  return (
    <>
      <Physics>
        <Course />
        <Marble meshRef={marble} />
      </Physics>

      {/* Sky, fog and lights: blended from zone to zone as the marble rolls. */}
      <Lights target={marble} />
      <FollowCamera target={marble} />
      <Scenery course={course} />
    </>
  );
}
