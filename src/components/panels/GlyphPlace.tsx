import type { GlyphSettings } from "../../engine/types";
import { DEFAULT_GLYPH_SCALE } from "../../engine/defaults";
import { PercentSlider, Slider } from "./Slider";

const MARK_OFFSET_Y = 2;

export function GlyphPlace({
  glyph,
  onChange,
  sizeMin = 0.15,
  sizeMax = 1.6,
  defaultScale = DEFAULT_GLYPH_SCALE,
  defaultOffsetY = 0,
}: {
  glyph: GlyphSettings;
  onChange: (patch: Partial<GlyphSettings>) => void;
  sizeMin?: number;
  sizeMax?: number;
  defaultScale?: number;
  defaultOffsetY?: number;
}) {
  const mark = glyph.kind === "symbol" || glyph.kind === "logo";
  const yMin = mark ? -MARK_OFFSET_Y : -1;
  const yMax = mark ? MARK_OFFSET_Y : 1;

  return (
    <>
      <PercentSlider
        label="Size"
        hint="How large this mark is versus its default. 0% is the default size; negative shrinks, positive grows."
        value={glyph.scale}
        defaultValue={defaultScale}
        min={sizeMin}
        max={sizeMax}
        onChange={(n) => onChange({ scale: n })}
      />
      <Slider
        label="Move X"
        hint="Slide the mark left or right on the face."
        value={glyph.offsetX}
        min={-1}
        max={1}
        step={0.01}
        defaultValue={0}
        onChange={(n) => onChange({ offsetX: n })}
      />
      <Slider
        label="Move Y"
        hint="Slide the mark up or down on the face. Positive moves toward the top of the face."
        value={glyph.offsetY}
        min={yMin}
        max={yMax}
        step={0.01}
        defaultValue={defaultOffsetY}
        onChange={(n) => onChange({ offsetY: n })}
      />
      <Slider
        label="Rotation"
        hint="Turn the mark on the face, in degrees. 0° is upright."
        value={glyph.rotation}
        min={-180}
        max={180}
        step={1}
        suffix="°"
        defaultValue={0}
        onChange={(n) => onChange({ rotation: n })}
      />
    </>
  );
}
