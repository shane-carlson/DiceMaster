import { BufferGeometry } from "three";

/** Count edges that are not shared by exactly two triangles (indexed mesh). */
export function openEdgeCount(geometry: BufferGeometry): number {
  const pos = geometry.getAttribute("position");
  const idx = geometry.index;
  if (!pos || !idx || idx.count < 3) return -1;
  const counts = new Map<string, number>();
  const edge = (a: number, b: number) => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i);
    const b = idx.getX(i + 1);
    const c = idx.getX(i + 2);
    edge(a, b);
    edge(b, c);
    edge(c, a);
  }
  let open = 0;
  for (const n of counts.values()) {
    if (n !== 2) open++;
  }
  return open;
}
