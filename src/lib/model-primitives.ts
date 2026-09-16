import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Original, dimension-referenced meshes. Body proportions follow the public
// specifications; these are presentation models, not manufacturer CAD files.
export type DeviceModel = {
  group: THREE.Group;
  screen: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>;
  screenRatio: number;
};

type Material = THREE.Material;
const PI = Math.PI;
export function roundedShape(w: number, h: number, r: number) {
  r = Math.max(0.0001, Math.min(r, w / 2, h / 2));
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.absarc(w / 2 - r, -h / 2 + r, r, -PI / 2, 0, false);
  s.lineTo(w / 2, h / 2 - r);
  s.absarc(w / 2 - r, h / 2 - r, r, 0, PI / 2, false);
  s.lineTo(-w / 2 + r, h / 2);
  s.absarc(-w / 2 + r, h / 2 - r, r, PI / 2, PI, false);
  s.lineTo(-w / 2, -h / 2 + r);
  s.absarc(-w / 2 + r, -h / 2 + r, r, PI, 1.5 * PI, false);
  s.closePath();
  return s;
}
export function extrude(
  shape: THREE.Shape,
  depth: number,
  bevel: number,
  mat: Material,
) {
  const raw = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 32,
  });
  raw.translate(0, 0, -(depth - bevel * 2) / 2);
  // ExtrudeGeometry splits every face. Weld the surface before recomputing
  // normals so specular reflections remain continuous around the bevels.
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const geometry = mergeVertices(raw, 0.000001);
  raw.dispose();
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}
export function shell(
  w: number,
  h: number,
  d: number,
  r: number,
  mat: Material,
  bevel = 0.012,
) {
  const b = Math.min(bevel, d * 0.3, r * 0.45);
  return extrude(roundedShape(w - b * 2, h - b * 2, r - b), d, b, mat);
}
export function surface<M extends Material>(
  w: number,
  h: number,
  r: number,
  mat: M,
) {
  const geo = new THREE.ShapeGeometry(roundedShape(w, h, r), 48);
  const uv = geo.attributes.uv,
    p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return new THREE.Mesh(geo, mat);
}
export function put<T extends THREE.Object3D>(
  g: THREE.Group,
  obj: T,
  x = 0,
  y = 0,
  z = 0,
) {
  obj.position.set(x, y, z);
  g.add(obj);
  return obj;
}
export function metal(color: THREE.ColorRepresentation, roughness = 0.3) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.88,
    roughness,
    clearcoat: 0.22,
    clearcoatRoughness: 0.22,
  });
}
export function plastic(color: THREE.ColorRepresentation, roughness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}
export function glass(color: THREE.ColorRepresentation = "#08090b") {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.16,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
}
export function disc(r: number, mat: Material) {
  return new THREE.Mesh(new THREE.CircleGeometry(r, 64), mat);
}
export function ring(outer: number, inner: number, mat: Material) {
  return new THREE.Mesh(new THREE.RingGeometry(inner, outer, 80), mat);
}
export function cylinder(r: number, depth: number, mat: Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 80), mat);
  m.rotation.x = PI / 2;
  m.castShadow = true;
  return m;
}
export function screen(
  g: THREE.Group,
  w: number,
  h: number,
  r: number,
  y: number,
  z: number,
) {
  const m = surface(
    w,
    h,
    r,
    new THREE.MeshBasicMaterial({ color: "white", toneMapped: false }),
  );
  m.name = "Screenshot";
  put(g, m, 0, y, z);
  return m;
}
