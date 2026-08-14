import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh as ThreeMesh,
  Vector3,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { PlacedGlyph } from "../../engine/buildDie";
import { faceOutline3D, geometryFromFaces, type DieFace } from "../../engine/faces";

function GlyphMesh({ glyph, color }: { glyph: PlacedGlyph; color: string }) {
  const ref = useRef<ThreeMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.matrix.copy(glyph.matrix);
    mesh.matrixAutoUpdate = false;
  }, [glyph]);

  return (
    <mesh ref={ref} geometry={glyph.geometry} renderOrder={2}>
      <meshBasicMaterial
        color={color}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
}

function closestFaceIndex(localPoint: Vector3, faces: DieFace[]): number | null {
  if (faces.length === 0) return null;
  let best = faces[0].index;
  let bestD = Infinity;
  for (const face of faces) {
    const d = Math.abs(localPoint.clone().sub(face.center).dot(face.normal));
    if (d < bestD) {
      bestD = d;
      best = face.index;
    }
  }
  return best;
}

export function DieMesh({
  body,
  glyphs,
  faces,
  color,
  selected,
  selectedFace,
  inspectFace = false,
  onSelectFace,
  onSelectDie,
}: {
  body: BufferGeometry;
  glyphs: PlacedGlyph[];
  faces: DieFace[];
  color: string;
  selected: boolean;
  selectedFace: number | null;
  inspectFace?: boolean;
  onSelectFace: (index: number) => void;
  onSelectDie: () => void;
}) {
  const highlight = useMemo(() => {
    if (inspectFace || selectedFace === null) return null;
    const face = faces[selectedFace];
    if (!face) return null;
    const ring = faceOutline3D(face);
    if (ring.length < 3) return null;
    const geom = new BufferGeometry();
    const verts: number[] = [];
    const lift = face.normal.clone().multiplyScalar(0.14);
    const origin = ring[0].clone().add(lift);
    for (let i = 1; i < ring.length - 1; i++) {
      const b = ring[i].clone().add(lift);
      const d = ring[i + 1].clone().add(lift);
      verts.push(origin.x, origin.y, origin.z, b.x, b.y, b.z, d.x, d.y, d.z);
    }
    if (verts.length < 9) return null;
    geom.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    geom.computeVertexNormals();
    return geom;
  }, [faces, selectedFace, inspectFace]);

  const shaded = useMemo(() => geometryFromFaces(faces), [faces]);
  const displayBody = shaded ?? body;

  useLayoutEffect(() => {
    return () => {
      shaded?.dispose();
      highlight?.dispose();
    };
  }, [shaded, highlight]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const local = e.object.worldToLocal(e.point.clone());
    const mapped = closestFaceIndex(local, faces);
    if (mapped !== null) onSelectFace(mapped);
    else onSelectDie();
  };

  return (
    <group>
      <mesh geometry={displayBody} onClick={onClick}>
        <meshStandardMaterial
          color={color}
          roughness={inspectFace ? 0.62 : 0.52}
          metalness={0.02}
          emissive={inspectFace ? "#000000" : selected ? "#5c4018" : "#110a06"}
          emissiveIntensity={inspectFace ? 0 : selected ? 0.28 : 0.04}
        />
      </mesh>
      {glyphs.map((g, i) => (
        <GlyphMesh
          key={`${g.faceIndex}-${g.role}-${i}`}
          glyph={g}
          color={g.role === "emblem" ? "#f0d78a" : inspectFace ? "#0a0604" : "#070504"}
        />
      ))}
      {highlight && (
        <mesh geometry={highlight} renderOrder={3}>
          <meshBasicMaterial
            color="#f0d78a"
            transparent
            opacity={0.32}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
