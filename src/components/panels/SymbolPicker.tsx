import { symbolsByCategory } from "../../engine/symbols";

export function SymbolSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {symbolsByCategory().map((group) => (
        <optgroup key={group.category} label={group.category}>
          {group.symbols.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
