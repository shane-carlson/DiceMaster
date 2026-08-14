import { formatSignedPercent, percentToScale, scaleToPercent } from "../../engine/scalePercent";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  suffix?: string;
  display?: (n: number) => string;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <label>{label}</label>
        <span>
          {display ? display(value) : `${Number.isInteger(step) ? value : value.toFixed(2)}${suffix}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Size/scale slider: 0% is the default, negative shrinks, positive grows. */
export function PercentSlider({
  label,
  value,
  defaultValue,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const pct = scaleToPercent(value, defaultValue);
  const minPct = scaleToPercent(min, defaultValue);
  const maxPct = scaleToPercent(max, defaultValue);
  return (
    <Slider
      label={label}
      value={pct}
      min={minPct}
      max={maxPct}
      step={1}
      display={formatSignedPercent}
      onChange={(p) => {
        const next = percentToScale(p, defaultValue);
        onChange(Math.min(max, Math.max(min, next)));
      }}
    />
  );
}
