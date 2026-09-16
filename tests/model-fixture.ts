import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Original test geometry. No third-party model or network assets.
export function modelFixture() {
  const chunks: Buffer[] = [];
  const bufferViews: {
    buffer: number;
    byteOffset: number;
    byteLength: number;
  }[] = [];
  const accessors: {
    bufferView: number;
    componentType: number;
    count: number;
    type: string;
    min?: number[];
    max?: number[];
  }[] = [];
  let offset = 0;
  const attribute = (
    values: THREE.TypedArray,
    itemSize: number,
    bounds?: { min: number[]; max: number[] },
  ) => {
    const b = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: b.length });
    chunks.push(b);
    offset += b.length;
    const padding = (4 - (offset % 4)) % 4;
    chunks.push(Buffer.alloc(padding));
    offset += padding;
    accessors.push({
      bufferView: bufferViews.length - 1,
      componentType:
        values instanceof Float32Array
          ? 5126
          : values instanceof Uint32Array
            ? 5125
            : 5123,
      count: values.length / itemSize,
      type: itemSize === 1 ? "SCALAR" : `VEC${itemSize}`,
      ...bounds,
    });
    return accessors.length - 1;
  };
  const geometry = (g: THREE.BufferGeometry, material: number) => {
    g.computeBoundingBox();
    const pos = g.getAttribute("position"),
      norm = g.getAttribute("normal"),
      uv = g.getAttribute("uv");
    const attributes = {
      POSITION: attribute(pos.array, 3, {
        min: g.boundingBox!.min.toArray(),
        max: g.boundingBox!.max.toArray(),
      }),
      NORMAL: attribute(norm.array, 3),
      TEXCOORD_0: attribute(uv.array, 2),
    };
    const primitive = {
      attributes,
      material,
      ...(g.index ? { indices: attribute(g.index.array, 1) } : {}),
    };
    g.dispose();
    return { primitives: [primitive] };
  };
  const panel = new THREE.PlaneGeometry(2.8, 1.8);
  const uv = panel.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const meshes = [
    geometry(new RoundedBoxGeometry(3.1, 2.1, 0.18, 4, 0.07), 0),
    geometry(panel, 1),
    geometry(new RoundedBoxGeometry(0.3, 0.7, 0.13, 3, 0.02), 0),
    geometry(new RoundedBoxGeometry(1.0, 0.06, 0.7, 3, 0.02), 0),
  ];
  const binary = Buffer.concat(chunks);
  const json = {
    asset: {
      version: "2.0",
      generator: "stagemyscreen local import test fixture",
    },
    scene: 0,
    scenes: [{ nodes: [0, 1, 2, 3] }],
    nodes: [
      { name: "Aluminum enclosure", mesh: 0, translation: [8, 5, 0] },
      { name: "Screen", mesh: 1, translation: [8, 5, 0.1] },
      { name: "Stand", mesh: 2, translation: [8, 3.6, -0.03] },
      { name: "Foot", mesh: 3, translation: [8, 3.25, 0.15] },
    ],
    meshes,
    accessors,
    bufferViews,
    buffers: [
      {
        byteLength: binary.length,
        uri: `data:application/octet-stream;base64,${binary.toString("base64")}`,
      },
    ],
    materials: [
      {
        name: "Brushed silver",
        pbrMetallicRoughness: {
          baseColorFactor: [0.62, 0.68, 0.72, 1],
          metallicFactor: 0.85,
          roughnessFactor: 0.25,
        },
      },
      {
        name: "Display glass",
        pbrMetallicRoughness: {
          baseColorFactor: [0.05, 0.22, 0.17, 1],
          metallicFactor: 0,
          roughnessFactor: 0.5,
        },
      },
    ],
  };
  return { json, binary };
}

export function packGLB(json: object, binary: Buffer) {
  const data = Buffer.from(JSON.stringify(json)),
    paddedJSON = Buffer.concat([
      data,
      Buffer.alloc((4 - (data.length % 4)) % 4, 32),
    ]);
  const paddedBin = Buffer.concat([
    binary,
    Buffer.alloc((4 - (binary.length % 4)) % 4),
  ]);
  const header = Buffer.alloc(12),
    jsonHeader = Buffer.alloc(8),
    binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + paddedJSON.length + paddedBin.length, 8);
  jsonHeader.writeUInt32LE(paddedJSON.length);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  binHeader.writeUInt32LE(paddedBin.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, paddedJSON, binHeader, paddedBin]);
}
