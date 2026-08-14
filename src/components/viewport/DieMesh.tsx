import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh as ThreeMesh,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { PlacedGlyph } from "../../engine/buildDie";
import { faceOutline3D, geometryFromFaces, pickFaceIndex, type DieFace } from "../../engine/faces";
import { numeralInk } from "../../engine/ink";

function GlyphMesh({
  glyph,
  color,
  inspectFace,
}: {
  glyph: PlacedGlyph;
  color: string;
  inspectFace: boolean;
}) {
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
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={inspectFace ? -2 : -1}
        polygonOffsetUnits={inspectFace ? -24 : -12}
      />
    </mesh>
  );
}

function noopRaycast() {}

export function DieMesh({
  body,
  glyphs,
  faces,
  color,
  selected,
  selectedFace,
  inspectFace = false,
  rounded = false,
  interactive = true,
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
  rounded?: boolean;
  interactive?: boolean;
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

  const shaded = useMemo(
    () => (rounded ? null : geometryFromFaces(faces)),
    [faces, rounded],
  );
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
    const mapped = pickFaceIndex(local, faces);
    if (mapped !== null) onSelectFace(mapped);
    else onSelectDie();
  };

  return (
    <group>
      <mesh
        geometry={displayBody}
        visible={interactive}
        raycast={interactive ? undefined : noopRaycast}
        onClick={interactive ? onClick : undefined}
      >
        <meshStandardMaterial
          color={color}
          roughness={inspectFace ? 0.46 : 0.52}
          metalness={0.02}
          emissive={inspectFace ? "#000000" : selected ? "#0066cc" : "#000000"}
          emissiveIntensity={inspectFace ? 0 : selected ? 0.16 : 0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {glyphs.map((g, i) => (
        <GlyphMesh
          key={`${g.faceIndex}-${g.role}-${i}`}
          glyph={g}
          color={numeralInk(color, g.role === "emblem" ? "emblem" : "primary")}
          inspectFace={inspectFace}
        />
      ))}
      {highlight && (
        <mesh geometry={highlight} renderOrder={3}>
          <meshBasicMaterial
            color="#0066cc"
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
