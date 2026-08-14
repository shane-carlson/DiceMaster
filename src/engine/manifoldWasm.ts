import type { ManifoldToplevel } from "manifold-3d";

let cached: ManifoldToplevel | null = null;
let loading: Promise<ManifoldToplevel> | null = null;

/** Load the Manifold WASM module once (Node tests and the Vite app). */
export function loadManifold(): Promise<ManifoldToplevel> {
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    loading = (async () => {
      const Module = (await import("manifold-3d")).default;
      let wasm: ManifoldToplevel;
      try {
        wasm = await Module();
      } catch {
        const wasmUrl = (await import("manifold-3d/manifold.wasm?url")).default;
        wasm = await Module({ locateFile: () => wasmUrl });
      }
      wasm.setup();
      cached = wasm;
      return wasm;
    })();
  }
  return loading;
}
