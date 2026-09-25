import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type InstancedMesh,
  type Material,
} from 'three';
import type { Theme } from '../game/config';
import { blockZ, type Course } from '../game/course';
import { createRng, type Rng } from '../game/rng';
import { themeMix } from '../game/zones';
import { merge, paint } from './geometry';
import { materials } from './materials';
import { mixColor } from './themes';

/** The backdrop starts this far behind the start and runs this far past the finish. */
const MARGIN_BEHIND = 10;
const MARGIN_BEYOND = 16;
/** Distance between islands along each side of the course. */
const ISLAND_SPACING = [2.8, 4.2] as const;
/** Loose rocks per metre of course. */
const ROCK_DENSITY = 0.28;
const STARS_PER_NIGHT_ZONE = 260;

// Islands: an upside-down cone of rock with a flat cap on top (grass, sand, snow…), top at y = 0.
const islandGeometry = new CylinderGeometry(1, 0.32, 1.1, 7).translate(0, -0.55, 0);
const capGeometry = new CylinderGeometry(1.05, 1, 0.16, 7).translate(0, 0.06, 0);
const rockGeometries = [
  new IcosahedronGeometry(1, 0),
  new OctahedronGeometry(1, 0),
  new DodecahedronGeometry(1, 0),
];
const moonGeometry = new SphereGeometry(4, 16, 12);

interface PropType {
  geometry: BufferGeometry;
  /** Night props are unlit, so they glow in the dusk. */
  glow?: boolean;
}

/** Two kinds of prop per theme, each one merged mesh standing on y = 0. */
const PROPS: Record<Theme, PropType[]> = {
  meadow: [
    {
      geometry: merge(
        paint(new CylinderGeometry(0.11, 0.15, 0.8, 6), '#d9b39a').translate(0, 0.4, 0),
        paint(new IcosahedronGeometry(0.62, 0), '#9fdcb0').translate(0, 1.2, 0),
        paint(new IcosahedronGeometry(0.4, 0), '#b4e6be').translate(0.3, 1.55, 0.1),
      ),
    },
    {
      geometry: merge(
        paint(new IcosahedronGeometry(0.42, 0), '#b5e3a1').translate(0, 0.3, 0),
        paint(new IcosahedronGeometry(0.3, 0), '#a4d99a').translate(0.35, 0.22, 0.12),
        paint(new OctahedronGeometry(0.1, 0), '#ffc2d6').translate(-0.1, 0.72, 0.15),
      ),
    },
  ],
  desert: [
    {
      geometry: merge(
        paint(new CylinderGeometry(0.17, 0.2, 1.3, 7), '#9fd3a6').translate(0, 0.65, 0),
        paint(new CylinderGeometry(0.1, 0.1, 0.5, 6), '#9fd3a6').translate(0.32, 0.95, 0),
        paint(new CylinderGeometry(0.1, 0.1, 0.34, 6), '#9fd3a6')
          .rotateZ(Math.PI / 2)
          .translate(0.18, 0.72, 0),
        paint(new CylinderGeometry(0.09, 0.09, 0.4, 6), '#9fd3a6').translate(-0.3, 0.75, 0),
        paint(new CylinderGeometry(0.09, 0.09, 0.3, 6), '#9fd3a6')
          .rotateZ(Math.PI / 2)
          .translate(-0.17, 0.57, 0),
        paint(new OctahedronGeometry(0.09, 0), '#ffb3c7').translate(0, 1.35, 0),
      ),
    },
    {
      geometry: merge(
        paint(new CylinderGeometry(0.65, 0.9, 0.6, 6), '#efb79b').translate(0, 0.3, 0),
        paint(new CylinderGeometry(0.66, 0.66, 0.1, 6), '#f7cfb6').translate(0, 0.62, 0),
      ),
    },
  ],
  snow: [
    {
      geometry: merge(
        paint(new CylinderGeometry(0.08, 0.1, 0.4, 5), '#cbb2a4').translate(0, 0.2, 0),
        paint(new ConeGeometry(0.62, 0.7, 7), '#9ccbc2').translate(0, 0.65, 0),
        paint(new ConeGeometry(0.48, 0.6, 7), '#a8d4cb').translate(0, 1.05, 0),
        paint(new ConeGeometry(0.33, 0.5, 7), '#b5ddd5').translate(0, 1.4, 0),
        paint(new ConeGeometry(0.16, 0.22, 7), '#ffffff').translate(0, 1.62, 0),
      ),
    },
    {
      geometry: merge(
        paint(new OctahedronGeometry(0.3, 0), '#bfe3f7').scale(1, 2, 1).translate(0, 0.6, 0),
        paint(new OctahedronGeometry(0.2, 0), '#d8efff').scale(1, 1.8, 1).translate(0.3, 0.36, 0.1),
      ),
    },
  ],
  night: [
    {
      glow: true,
      geometry: merge(
        paint(new OctahedronGeometry(0.3, 0), '#ffc9ef').scale(1, 2.2, 1).translate(0, 0.66, 0),
        paint(new OctahedronGeometry(0.2, 0), '#d7ccff').scale(1, 2, 1).translate(-0.3, 0.4, 0.12),
      ),
    },
    {
      glow: true,
      geometry: merge(
        paint(new CylinderGeometry(0.05, 0.06, 1, 5), '#9d92d8').translate(0, 0.5, 0),
        paint(new IcosahedronGeometry(0.2, 0), '#fff1b8').translate(0, 1.1, 0),
      ),
    },
  ],
};

interface Placement {
  matrix: Matrix4;
  color?: Color;
}

interface Rock {
  position: Vector3;
  scale: number;
  spin: number;
  bob: number;
  shape: number;
  color: Color;
}

const position = new Vector3();
const rotation = new Quaternion();
const frameMatrix = new Matrix4();
const euler = new Euler();
const scaled = new Vector3();

function place(x: number, y: number, z: number, sx: number, sy: number, turn: number): Matrix4 {
  return new Matrix4().compose(
    position.set(x, y, z),
    rotation.setFromEuler(euler.set(0, turn, 0)),
    scaled.set(sx, sy, sx),
  );
}

/** Picks a theme at random, as likely as its weight: props thin out across zone borders. */
function pickTheme(rng: Rng, themes: readonly Theme[], weights: readonly number[]): Theme {
  let roll = rng.next();
  for (let i = 0; i < themes.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return themes[i] as Theme;
  }
  return themes.at(-1) ?? 'meadow';
}

/**
 * Lays out the backdrop for a course. A fixed seed keeps it the same from one run to the next;
 * it spans the whole course, finish included, and follows its zones.
 */
function layOut(course: Course) {
  const rng = createRng(20260924);
  const themes = course.zones.map((zone) => zone.theme);
  const from = MARGIN_BEHIND;
  const to = -(course.length + MARGIN_BEYOND);

  const islands: Placement[] = [];
  const caps: Placement[] = [];
  const props = new Map<PropType, Placement[]>();

  for (const side of [-1, 1]) {
    for (let z = from - rng.range(0, 2); z > to; z -= rng.range(...ISLAND_SPACING)) {
      const weights = themeMix(course.zones, z);
      const size = rng.range(0.9, 1.7);
      const x = side * rng.range(5.5, 13);
      const y = rng.range(-4.5, -1.4);
      const height = size * rng.range(0.8, 1.2);
      const turn = rng.range(0, Math.PI * 2);
      islands.push({
        matrix: place(x, y, z, size, height, turn),
        color: mixColor(themes, weights, 'island', new Color()),
      });
      caps.push({
        matrix: place(x, y, z, size, height, turn),
        color: mixColor(themes, weights, 'islandTop', new Color()),
      });

      const theme = pickTheme(rng, themes, weights);
      const count = rng.int(1, 2);
      for (let i = 0; i < count; i++) {
        const type = PROPS[theme][rng.int(0, 1)] as PropType;
        const angle = rng.range(0, Math.PI * 2);
        const r = rng.range(0, 0.55) * size;
        const propSize = rng.range(0.8, 1.25) * (0.8 + size * 0.25);
        const list = props.get(type) ?? [];
        list.push({
          matrix: place(
            x + Math.cos(angle) * r,
            y + 0.14 * height,
            z + Math.sin(angle) * r,
            propSize,
            propSize,
            rng.range(0, Math.PI * 2),
          ),
        });
        props.set(type, list);
      }
    }
  }

  const rocks: Rock[] = Array.from({ length: Math.round((from - to) * ROCK_DENSITY) }, () => {
    const z = rng.range(to, from);
    return {
      position: new Vector3(rng.sign() * rng.range(4, 16), rng.range(-9, 4), z),
      scale: rng.range(0.3, 1.3),
      spin: rng.range(0.05, 0.25) * rng.sign(),
      bob: rng.range(0, Math.PI * 2),
      shape: rng.int(0, rockGeometries.length - 1),
      color: mixColor(themes, themeMix(course.zones, z), 'rock', new Color()),
    };
  });

  // Stars over each night zone (up in the sky, ahead of the marble), plus one moon.
  const nights = course.zones.filter((zone) => zone.theme === 'night');
  const stars = new Float32Array(nights.length * STARS_PER_NIGHT_ZONE * 3);
  nights.forEach((zone, n) => {
    const near = blockZ(zone.from) + 20;
    const far = blockZ(zone.to) - 60;
    for (let i = 0; i < STARS_PER_NIGHT_ZONE; i++) {
      const at = (n * STARS_PER_NIGHT_ZONE + i) * 3;
      stars[at] = rng.range(-80, 80);
      stars[at + 1] = rng.range(6, 50);
      stars[at + 2] = rng.range(far, near);
    }
  });
  const firstNight = nights[0];
  const moon = firstNight
    ? new Vector3(-26, 22, (blockZ(firstNight.from) + blockZ(firstNight.to)) / 2 - 45)
    : null;

  return { islands, caps, props: [...props], rocks, stars, moon };
}

/**
 * Pastel islands, each carrying props of its zone (trees, cacti, pines, glowing crystals…),
 * loose rocks drifting around them and, over night zones, stars and a moon. Every repeated
 * piece is instanced: the whole backdrop takes about a dozen draw calls whatever the length.
 */
export function Scenery({ course }: { course: Course }) {
  const layout = useMemo(() => layOut(course), [course]);
  const rockMeshes = useRef<(InstancedMesh | null)[]>([]);
  const starGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(layout.stars, 3));
    return geometry;
  }, [layout]);
  const rocksByShape = useMemo(
    () =>
      rockGeometries.map((_, shape) => {
        const rocks = layout.rocks.filter((rock) => rock.shape === shape);
        // Placed every frame by the animation below; only their colours are set up front.
        return {
          rocks,
          items: rocks.map((rock) => ({ matrix: new Matrix4(), color: rock.color })),
        };
      }),
    [layout],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rocksByShape.forEach(({ rocks }, shape) => {
      const mesh = rockMeshes.current[shape];
      if (!mesh) return;
      rocks.forEach((rock, i) => {
        position.copy(rock.position).setY(rock.position.y + Math.sin(t * 0.6 + rock.bob) * 0.25);
        rotation.setFromEuler(euler.set(t * rock.spin, t * rock.spin * 1.3, 0));
        mesh.setMatrixAt(i, frameMatrix.compose(position, rotation, scaled.setScalar(rock.scale)));
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      <Instances geometry={islandGeometry} material={materials.tinted} items={layout.islands} />
      <Instances geometry={capGeometry} material={materials.tinted} items={layout.caps} />
      {layout.props.map(([type, items]) => (
        <Instances
          key={type.geometry.uuid}
          geometry={type.geometry}
          material={type.glow ? materials.glowProps : materials.props}
          items={items}
        />
      ))}
      {rocksByShape.map(({ items }, shape) => (
        <Instances
          key={shape}
          ref={(mesh) => {
            rockMeshes.current[shape] = mesh;
          }}
          geometry={rockGeometries[shape] as BufferGeometry}
          material={materials.tinted}
          items={items}
        />
      ))}
      {layout.stars.length > 0 && <points geometry={starGeometry} material={materials.stars} />}
      {layout.moon && (
        <mesh geometry={moonGeometry} material={materials.moon} position={layout.moon} />
      )}
    </>
  );
}

function Instances({
  geometry,
  material,
  items,
  ref,
}: {
  geometry: BufferGeometry;
  material: Material;
  items: readonly Placement[];
  ref?: (mesh: InstancedMesh | null) => void;
}) {
  const mesh = useRef<InstancedMesh | null>(null);

  useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    items.forEach(({ matrix, color }, i) => {
      instances.setMatrixAt(i, matrix);
      if (color) instances.setColorAt(i, color);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh
      ref={(instances) => {
        mesh.current = instances;
        ref?.(instances);
      }}
      args={[geometry, material, items.length]}
      // Rocks move every frame: their bounds are unknown ahead of time, so never cull them.
      frustumCulled={ref === undefined}
    />
  );
}
