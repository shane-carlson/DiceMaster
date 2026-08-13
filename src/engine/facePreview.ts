import { extractFaces, faceOutline2D } from "./faces";
import { createDieGeometry } from "./geometry";
import { numberFaces } from "./numbering";
import { d4CornerPlacements, tetraOppositeVertexLabels, usesVertexNumerals } from "./d4";
import type { DieInstance, FaceKind } from "./types";

export interface FaceMarkPreview {
  x: number;
  y: number;
  rotation: number;
  text: string;
}

export interface FacePreview {
  dieId: string;
  dieName: string;
  dieColor: string;
  dieType: DieInstance["type"];
  faceIndex: number;
  kind: FaceKind;
  polygon: { x: number; y: number }[];
  marks: FaceMarkPreview[];
}

function projectFace(die: DieInstance): FacePreview[] {
  const geom = createDieGeometry(die.type, die.sizeMm);
  const faces = numberFaces(die.type, extractFaces(geom, die.type), die.d10Style);
  const vertexLabels = usesVertexNumerals(die.type) ? tetraOppositeVertexLabels(faces) : null;
  geom.dispose();

  return faces.map((face) => {
    const settings = die.faces[face.index];
    const pts = faceOutline2D(face);
    let marks: FaceMarkPreview[] = [];
    const kind = settings?.primary.kind ?? "number";
    if (kind === "blank") {
      marks = [];
    } else if (vertexLabels && kind === "number") {
      marks = d4CornerPlacements(face, vertexLabels).map((c) => ({
        x: c.ox,
        y: c.oy,
        rotation: c.rotation,
        text: c.label,
      }));
    } else if (kind === "number" || kind === "text") {
      marks = [
        {
          x: (settings?.primary.offsetX ?? 0) * 0.35 * Math.max(...pts.map((p) => Math.hypot(p.x, p.y)), 1),
          y: (settings?.primary.offsetY ?? 0) * 0.35 * Math.max(...pts.map((p) => Math.hypot(p.x, p.y)), 1),
          rotation: settings?.primary.rotation ?? 0,
          text: settings?.primary.text || face.label,
        },
      ];
    } else if (kind === "symbol") {
      marks = [{ x: 0, y: 0, rotation: 0, text: "✦" }];
    } else if (kind === "logo") {
      marks = [{ x: 0, y: 0, rotation: 0, text: "▣" }];
    }
    return {
      dieId: die.id,
      dieName: die.name,
      dieColor: die.color,
      dieType: die.type,
      faceIndex: face.index,
      kind,
      polygon: pts,
      marks,
    };
  });
}

export function previewFacesForSet(dice: DieInstance[]): FacePreview[] {
  return dice.flatMap(projectFace);
}
