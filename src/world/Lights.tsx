import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import {
  Color,
  Fog,
  Vector3,
  type DirectionalLight,
  type HemisphereLight,
  type Object3D,
} from 'three';
import { themeMix } from '../game/zones';
import { useGame } from '../hooks/useGame';
import { materials } from './materials';
import { THEME_LOOKS, mixColor, mixNumber } from './themes';

/** Where the sun sits relative to the marble: high, to the left and slightly behind the camera. */
const SUN_OFFSET = new Vector3(-3, 9, 3);
/** Half-size of the area around the marble that receives shadows. */
const SHADOW_REACH = 7;
/**
 * How fast the sky and lights follow the zone mix (1/s). The mix itself already fades over
 * ZONE_BLEND metres; this also smooths a respawn that jumps back into the previous zone.
 */
const FOLLOW_RATE = 2.5;

const focus = new Vector3();
const goal = new Color();

/**
 * Sky, fog and lighting for the zone the marble is rolling through: soft sky fill plus a sun
 * that travels with the marble (so a small, sharp-enough shadow map covers what matters). All
 * of it blends from zone to zone as the marble moves, as do the night sky's stars and moon.
 */
export function Lights({ target }: { target: RefObject<Object3D | null> }) {
  const sun = useRef<DirectionalLight>(null);
  const sky = useRef<HemisphereLight>(null);
  const scene = useThree((state) => state.scene);
  const zones = useGame((state) => state.course.zones);
  const themes = useMemo(() => zones.map((zone) => zone.theme), [zones]);
  const primed = useRef(false);
  const first = THEME_LOOKS[themes[0] ?? 'meadow'];

  useFrame((_, delta) => {
    const light = sun.current;
    const fill = sky.current;
    const object = target.current;
    if (!light || !fill || !object) return;

    object.getWorldPosition(focus);
    light.position.copy(focus).add(SUN_OFFSET);
    light.target.position.copy(focus);
    light.target.updateMatrixWorld();

    const weights = themeMix(zones, focus.z);
    // Snap on the first frame; after that, ease towards the mix.
    const k = primed.current ? 1 - Math.exp(-FOLLOW_RATE * delta) : 1;
    primed.current = true;

    mixColor(themes, weights, 'sky', goal);
    if (scene.background instanceof Color) scene.background.lerp(goal, k);
    if (scene.fog instanceof Fog) scene.fog.color.lerp(goal, k);
    fill.color.lerp(mixColor(themes, weights, 'skyLight', goal), k);
    fill.groundColor.lerp(mixColor(themes, weights, 'groundLight', goal), k);
    fill.intensity += (mixNumber(themes, weights, 'ambient') - fill.intensity) * k;
    light.color.lerp(mixColor(themes, weights, 'sun', goal), k);
    light.intensity += (mixNumber(themes, weights, 'sunIntensity') - light.intensity) * k;

    const night = mixNumber(themes, weights, 'stars');
    materials.stars.opacity += (night - materials.stars.opacity) * k;
    materials.moon.opacity = materials.stars.opacity;
  });

  return (
    <>
      <color attach="background" args={[first.sky]} />
      <fog attach="fog" args={[first.sky, 14, 44]} />
      <hemisphereLight ref={sky} args={[first.skyLight, first.groundLight, first.ambient]} />
      <directionalLight
        ref={sun}
        color={first.sun}
        intensity={first.sunIntensity}
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
