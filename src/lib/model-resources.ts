import * as THREE from "three";

export function disposeObjects(
  objects: THREE.Object3D[],
  extra: THREE.Material[] = [],
) {
  const materials = new Set(extra),
    geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>(),
    bitmaps = new Set<ImageBitmap>();
  for (const root of objects)
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        if (o instanceof THREE.InstancedMesh) o.dispose();
        if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          materials.add(m);
      }
    });
  for (const m of materials) {
    for (const value of Object.values(m))
      if (value instanceof THREE.Texture) textures.add(value);
    m.dispose();
  }
  for (const t of textures) {
    if (
      typeof ImageBitmap !== "undefined" &&
      t.source.data instanceof ImageBitmap
    )
      bitmaps.add(t.source.data);
    t.dispose();
  }
  bitmaps.forEach((b) => b.close());
  geometries.forEach((g) => g.dispose());
}
