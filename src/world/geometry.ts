import { BufferAttribute, Color, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Paints a geometry one colour through vertex colours, so parts of different colours can be
 * merged into a single mesh (drawn with `materials.props`).
 */
export function paint(geometry: BufferGeometry, color: string): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute('uv');
  const rgb = new Color(color);
  const count = flat.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) rgb.toArray(colors, i * 3);
  flat.setAttribute('color', new BufferAttribute(colors, 3));
  return flat;
}

/** Merges painted parts into one geometry: one draw call for a many-coloured object. */
export function merge(...parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('Could not merge geometries: their attributes differ');
  return merged;
}
