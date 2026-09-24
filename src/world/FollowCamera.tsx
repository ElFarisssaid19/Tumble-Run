import { useFrame } from '@react-three/fiber';
import { useRef, type RefObject } from 'react';
import { MathUtils, PerspectiveCamera, Vector3, type Object3D } from 'three';

interface Rig {
  fov: number;
  /** Camera height above the marble. */
  height: number;
  /** Camera distance behind the marble. */
  distance: number;
}

// Tall phone screens are narrow, so the camera pulls back and widens to keep the track in view.
const PORTRAIT: Rig = { fov: 62, height: 4.2, distance: 5.6 };
const LANDSCAPE: Rig = { fov: 45, height: 2.9, distance: 4.9 };
const PORTRAIT_ASPECT = 0.45;
const LANDSCAPE_ASPECT = 1.3;

/** How quickly the camera catches up (higher is snappier). */
const POSITION_SHARPNESS = 4;
const LOOK_SHARPNESS = 9;
/** Look a bit ahead of the marble, down the course. */
const LOOK_AHEAD = 1.5;
/** Stop following a falling marble below this height. */
const LOWEST_FOCUS = -1.5;

function rigFor(aspect: number): Rig {
  const t = MathUtils.clamp(
    (aspect - PORTRAIT_ASPECT) / (LANDSCAPE_ASPECT - PORTRAIT_ASPECT),
    0,
    1,
  );
  return {
    fov: MathUtils.lerp(PORTRAIT.fov, LANDSCAPE.fov, t),
    height: MathUtils.lerp(PORTRAIT.height, LANDSCAPE.height, t),
    distance: MathUtils.lerp(PORTRAIT.distance, LANDSCAPE.distance, t),
  };
}

const focus = new Vector3();
const goal = new Vector3();
const lookGoal = new Vector3();

/** Keeps the camera smoothly behind and above the target, looking down the course. */
export function FollowCamera({ target }: { target: RefObject<Object3D | null> }) {
  const lookAt = useRef(new Vector3(0, 0, -2));

  useFrame(({ camera, size }, delta) => {
    const object = target.current;
    if (!object) return;

    object.getWorldPosition(focus);
    focus.y = Math.max(focus.y, LOWEST_FOCUS);
    const rig = rigFor(size.width / size.height);

    // Frame-rate independent exponential smoothing.
    goal.set(focus.x, focus.y + rig.height, focus.z + rig.distance);
    camera.position.lerp(goal, 1 - Math.exp(-POSITION_SHARPNESS * delta));
    lookGoal.set(focus.x, focus.y, focus.z - LOOK_AHEAD);
    lookAt.current.lerp(lookGoal, 1 - Math.exp(-LOOK_SHARPNESS * delta));
    camera.lookAt(lookAt.current);

    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - rig.fov) > 0.01) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
