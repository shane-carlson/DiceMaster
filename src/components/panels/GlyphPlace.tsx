import type { GlyphSettings } from "../../engine/types";
import { DEFAULT_GLYPH_SCALE } from "../../engine/defaults";
import { PercentSlider, Slider } from "./Slider";

export function GlyphPlace({
  glyph,
  onChange,
  sizeMin = 0.15,
  sizeMax = 1.6,
  defaultScale = DEFAULT_GLYPH_SCALE,
}: {
  glyph: GlyphSettings;
  onChange: (patch: Partial<GlyphSettings>) => void;
  sizeMin?: number;
  sizeMax?: number;
  defaultScale?: number;
}) {
  return (
    <>
      <PercentSlider
        label="Size"
        value={glyph.scale}
        defaultValue={defaultScale}
        min={sizeMin}
        max={sizeMax}
        onChange={(n) => onChange({ scale: n })}
      />
      <Slider
        label="Move X"
        value={glyph.offsetX}
        min={-1}
        max={1}
        step={0.01}
        onChange={(n) => onChange({ offsetX: n })}
      />
      <Slider
        label="Move Y"
        value={glyph.offsetY}
        min={-1}
        max={1}
        step={0.01}
        onChange={(n) => onChange({ offsetY: n })}
      />
      <Slider
        label="Rotation"
        value={glyph.rotation}
        min={-180}
        max={180}
        step={1}
        suffix="°"
        onChange={(n) => onChange({ rotation: n })}
      />
    </>
  );
}
