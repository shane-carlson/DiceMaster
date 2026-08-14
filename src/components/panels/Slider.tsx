import { InfoTip } from "../ui/InfoTip";
import { formatSignedPercent, percentToScale, scaleToPercent } from "../../engine/scalePercent";

export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
  display,
}: {
  label: string;
  hint: string;
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
        <label>
          {label}
          <InfoTip text={hint} />
        </label>
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
        aria-label={label}
        aria-valuetext={display ? display(value) : `${value}${suffix}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** Size/scale slider: 0% is the default, negative shrinks, positive grows. */
export function PercentSlider({
  label,
  hint,
  value,
  defaultValue,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
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
      hint={hint}
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
