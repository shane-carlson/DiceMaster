import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Matrix4,
  Mesh as ThreeMesh,
} from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { DieBuild, PlacedGlyph } from "../../engine/buildDie";
import { triangleToFaceMap } from "../../engine/faces";

/** Sit a thin, unlit inlay at the mouth of the cut so numerals stay readable. */
function glyphMatrix(glyph: PlacedGlyph, carved: boolean, engrave: boolean): Matrix4 {
  const m = glyph.matrix.clone();
  if (!engrave) return m;
  const depth = Math.max(glyph.depth, 0.25);
  // Cutters are shifted inward by 0.45*depth; bring the inlay back to the face
  // and park it just inside the cavity.
  const z = carved ? depth * 0.42 - 0.06 : 0.04;
  m.multiply(new Matrix4().makeTranslation(0, 0, z));
  m.multiply(new Matrix4().makeScale(1, 1, 0.05));
  return m;
}

function GlyphMesh({
  glyph,
  color,
  carved,
  engrave,
}: {
  glyph: PlacedGlyph;
  color: string;
  carved: boolean;
  engrave: boolean;
}) {
  const ref = useRef<ThreeMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.matrix.copy(glyphMatrix(glyph, carved, engrave));
    mesh.matrixAutoUpdate = false;
  }, [glyph, carved, engrave]);

  return (
    <mesh ref={ref} geometry={glyph.geometry} renderOrder={2}>
      <meshBasicMaterial
        color={color}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
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
  const faceMap = useMemo(() => triangleToFaceMap(build.faces), [build.faces]);
  const engrave = build.engraveMode === "engrave";

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
      <mesh geometry={build.body} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.38}
          metalness={0.02}
          flatShading
          emissive={selected ? "#5c4018" : "#110a06"}
          emissiveIntensity={selected ? 0.28 : 0.04}
        />
      </mesh>
      <mesh geometry={build.pickGeometry} visible={false} onClick={onClick} />
      {build.glyphs.map((g, i) => (
        <GlyphMesh
          key={`${g.faceIndex}-${g.role}-${i}`}
          glyph={g}
          carved={build.carved}
          engrave={engrave}
          color={g.role === "emblem" ? "#f0d78a" : "#070504"}
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
