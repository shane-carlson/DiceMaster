import { useEffect, useState } from "react";
import type { Font } from "opentype.js";
import { bakeEngraving, buildDie, type DieBuild } from "../engine/buildDie";
import type { DieInstance, LogoAsset } from "../engine/types";

export function useDieBuild(
  die: DieInstance | undefined,
  font: Font | null,
  logos: LogoAsset[],
  globalScale: number,
): { build: DieBuild | null; busy: boolean } {
  const [build, setBuild] = useState<DieBuild | null>(null);
  const [busy, setBusy] = useState(false);
  const key = die ? JSON.stringify(die) : "";
  const logoKey = logos.map((l) => l.id).join(",");

  useEffect(() => {
    if (!die || !font) {
      setBuild(null);
      return;
    }
    let alive = true;
    setBusy(true);
    const parsed = JSON.parse(key) as DieInstance;
    const timer = window.setTimeout(() => {
      buildDie(parsed, font, logos, globalScale, "preview")
        .then((next) => {
          try {
            const carved = bakeEngraving(next, parsed.engraveMode);
            return { ...next, body: carved, carved: true };
          } catch (err) {
            console.warn("CSG preview failed; showing uncut mesh", err);
            return next;
          }
        })
        .then((next) => {
          if (alive) setBuild(next);
        })
        .catch((err) => {
          console.error(err);
          if (alive) setBuild(null);
        })
        .finally(() => {
          if (alive) setBusy(false);
        });
    }, 80);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [die, font, key, logos, logoKey, globalScale]);

  return { build, busy };
}
