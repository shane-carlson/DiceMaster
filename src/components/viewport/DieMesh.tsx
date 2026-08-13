import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Mesh as ThreeMesh,
  MeshStandardMaterial,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { DieBuild, PlacedGlyph } from "../../engine/buildDie";
import { triangleToFaceMap } from "../../engine/faces";

function GlyphMesh({ glyph, color }: { glyph: PlacedGlyph; color: string }) {
  const ref = useRef<ThreeMesh>(null);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.48,
        metalness: 0.08,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [color],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.matrix.copy(glyph.matrix);
    mesh.matrixAutoUpdate = false;
  }, [glyph.matrix]);

  return <mesh ref={ref} geometry={glyph.geometry} material={material} />;
}

export function DieMesh({
  build,
  color,
  selected,
  selectedFace,
  onSelectFace,
  onSelectDie,
}: {
  build: DieBuild;
  color: string;
  selected: boolean;
  selectedFace: number | null;
  onSelectFace: (index: number) => void;
  onSelectDie: () => void;
}) {
  const bodyMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(color),
        roughness: 0.4,
        metalness: 0.22,
        emissive: new Color(selected ? "#4a3414" : "#000000"),
        emissiveIntensity: selected ? 0.16 : 0,
      }),
    [color, selected],
  );

  const faceMap = useMemo(() => triangleToFaceMap(build.faces), [build.faces]);

  const highlight = useMemo(() => {
    if (selectedFace === null) return null;
    const face = build.faces[selectedFace];
    if (!face || face.vertices.length < 3) return null;
    const geom = new BufferGeometry();
    const verts: number[] = [];
    const lift = face.normal.clone().multiplyScalar(0.14);
    const origin = face.vertices[0].clone().add(lift);
    for (let i = 1; i < face.vertices.length - 1; i++) {
      const b = face.vertices[i].clone().add(lift);
      const d = face.vertices[i + 1].clone().add(lift);
      verts.push(origin.x, origin.y, origin.z, b.x, b.y, b.z, d.x, d.y, d.z);
    }
    if (verts.length < 9) return null;
    geom.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    geom.computeVertexNormals();
    return geom;
  }, [build.faces, selectedFace]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelectDie();
    if (typeof e.faceIndex === "number") {
      const mapped = faceMap.get(e.faceIndex);
      if (mapped !== undefined) {
        onSelectFace(mapped);
        return;
      }
    }
    if (e.face) onSelectFace(e.face.normal.y >= 0 ? 0 : 1);
  };

  return (
    <group>
      <mesh
        geometry={build.body}
        material={bodyMat}
        onClick={onClick}
        castShadow
        receiveShadow
      />
      {build.glyphs.map((g, i) => (
        <GlyphMesh
          key={`${g.faceIndex}-${g.role}-${i}`}
          glyph={g}
          color={g.role === "emblem" ? "#e6c56a" : "#160f0c"}
        />
      ))}
      {highlight && (
        <mesh geometry={highlight} renderOrder={2}>
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
