import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import opentype from "opentype.js";
import { createDie, ensureTokenShape } from "./defaults";
import { extractFaces, faceInradius, glyphFitSize, canShadeFromFaces, geometryFromFaces } from "./faces";
import { previewFacesForSet } from "./facePreview";
import { createDieGeometry } from "./geometry";
import { normalizeProject } from "./projectIO";
import {
  TOKEN_DIAMETER_MM,
  TOKEN_MARK_FILL,
  TOKEN_THICKNESS_MM,
  createTokenGeometry,
  glyphSizeSliderMax,
  tokenBounds,
} from "./token";
import { TOKEN_SHAPES } from "./types";
import { buildDie } from "./buildDie";

const font = opentype.parse(readFileSync("public/fonts/Oswald-Bold.ttf").buffer);

describe("maker token", () => {
  it("defaults to 25mm diameter, 3.5mm thick, coin silhouette, blank faces", () => {
    const die = createDie("token");
    expect(die.name).toBe("Maker Token");
    expect(die.sizeMm).toBe(TOKEN_DIAMETER_MM);
    expect(die.sizeFormat).toBe("custom");
    expect(die.tokenShape).toBe("coin");
    expect(die.faces).toHaveLength(2);
    expect(die.faces.every((f) => f.primary.kind === "blank")).toBe(true);
  });

  for (const shape of TOKEN_SHAPES) {
    it(`${shape} is ${TOKEN_THICKNESS_MM}mm thick and ${TOKEN_DIAMETER_MM}mm across`, () => {
      const geo = createTokenGeometry(shape, TOKEN_DIAMETER_MM);
      const { diameter, thickness } = tokenBounds(geo);
      expect(thickness).toBeCloseTo(TOKEN_THICKNESS_MM, 3);
      expect(diameter).toBeCloseTo(TOKEN_DIAMETER_MM, 2);
    });

    it(`${shape} extracts two landing faces`, () => {
      const geo = createDieGeometry("token", TOKEN_DIAMETER_MM, shape);
      const faces = extractFaces(geo, "token");
      expect(faces).toHaveLength(2);
      expect(faces[0].center.y).toBeGreaterThan(faces[1].center.y);
      expect(Math.abs(faces[0].normal.y)).toBeGreaterThan(0.9);
      expect(Math.abs(faces[1].normal.y)).toBeGreaterThan(0.9);
      for (const face of faces) {
        expect(face.center.dot(face.normal)).toBeGreaterThan(0.2);
        expect(face.vertices.length).toBeGreaterThanOrEqual(3);
      }
    });
  }

  it("keeps thickness at 3.5mm when diameter changes", () => {
    const geo = createTokenGeometry("hexagon", 40);
    const { diameter, thickness } = tokenBounds(geo);
    expect(diameter).toBeCloseTo(40, 2);
    expect(thickness).toBeCloseTo(TOKEN_THICKNESS_MM, 3);
  });

  it("lets symbols fill 90% of the inscribed face at scale 1", () => {
    const geo = createDieGeometry("token", TOKEN_DIAMETER_MM, "coin");
    const face = extractFaces(geo, "token")[0];
    const r = faceInradius(face);
    expect(glyphFitSize(face, 0, TOKEN_MARK_FILL)).toBeCloseTo(2 * r * TOKEN_MARK_FILL, 5);
    expect(glyphSizeSliderMax("token", "symbol", "primary")).toBe(1);
    expect(glyphSizeSliderMax("token", "logo", "emblem")).toBe(1);
    expect(glyphSizeSliderMax("token", "number", "primary")).toBe(2.2);
    expect(glyphSizeSliderMax("d6", "symbol", "primary")).toBe(2.2);
  });

  it("previews two faces per silhouette", () => {
    for (const shape of TOKEN_SHAPES) {
      const die = createDie("token", "standard", { tokenShape: shape });
      const faces = previewFacesForSet([die]);
      expect(faces, shape).toHaveLength(2);
      for (const face of faces) {
        expect(face.polygon.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("hexagon and octagon previews match their sides", () => {
    const hex = createDie("token", "standard", { tokenShape: "hexagon" });
    const oct = createDie("token", "standard", { tokenShape: "octagon" });
    const tri = createDie("token", "standard", { tokenShape: "triangle" });
    expect(previewFacesForSet([hex])[0].polygon.length).toBe(6);
    expect(previewFacesForSet([oct])[0].polygon.length).toBe(8);
    expect(previewFacesForSet([tri])[0].polygon.length).toBe(3);
  });

  it("migrates a missing silhouette to coin", () => {
    const die = createDie("token");
    delete die.tokenShape;
    expect(ensureTokenShape(die).tokenShape).toBe("coin");
  });

  it("normalizeProject fills in tokenShape", () => {
    const die = createDie("token", "standard", { tokenShape: "shield" });
    const project = normalizeProject({
      version: 1,
      name: "Tokens",
      fontId: "oswald",
      globalDepth: 0.77,
      globalFontScale: 1,
      dice: [{ ...die, tokenShape: undefined }],
      logos: [],
    });
    expect(project.dice[0].tokenShape).toBe("coin");
  });

  it("builds a preview glyph on a shield token", async () => {
    const die = createDie("token", "standard", { tokenShape: "shield" });
    die.faces[0].primary = {
      ...die.faces[0].primary,
      kind: "symbol",
      symbolId: "star",
      scale: 1,
    };
    const build = await buildDie(die, font, [], 1, "preview");
    expect(build.faces).toHaveLength(2);
    expect(build.glyphs.length).toBeGreaterThan(0);
    const glyph = build.glyphs[0];
    const face = build.faces[0];
    const fit = glyphFitSize(face, 0, TOKEN_MARK_FILL);
    expect(fit).toBeGreaterThan(8);
    expect(Math.hypot(glyph.ox, glyph.oy)).toBeLessThan(faceInradius(face));
  });

  it("does not draw tokens as two hollow caps", () => {
    for (const shape of TOKEN_SHAPES) {
      const geo = createDieGeometry("token", TOKEN_DIAMETER_MM, shape);
      const faces = extractFaces(geo, "token");
      expect(canShadeFromFaces(faces), shape).toBe(false);
      const oneCap = geometryFromFaces([faces[0]]);
      expect(oneCap, shape).toBeTruthy();
      oneCap!.computeBoundingBox();
      const capH = oneCap!.boundingBox!.max.y - oneCap!.boundingBox!.min.y;
      expect(capH, shape).toBeLessThan(0.35);
      geo.computeBoundingBox();
      expect(geo.boundingBox!.max.y - geo.boundingBox!.min.y, shape).toBeCloseTo(
        TOKEN_THICKNESS_MM,
        3,
      );
    }
  });
});
