import { useEffect, useState } from "react";
import type { Font } from "opentype.js";
import { loadProjectFont } from "../engine/fonts";

export function useFont(fontId: string, customFontBase64?: string): Font | null {
  const [font, setFont] = useState<Font | null>(null);

  useEffect(() => {
    let alive = true;
    setFont(null);
    loadProjectFont(fontId, customFontBase64)
      .then((f) => {
        if (alive) setFont(f);
      })
      .catch(() => {
        if (alive) setFont(null);
      });
    return () => {
      alive = false;
    };
  }, [fontId, customFontBase64]);

  return font;
}
