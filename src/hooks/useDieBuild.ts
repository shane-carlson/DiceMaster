import { useEffect, useState } from "react";
import type { Font } from "opentype.js";
import { buildDie, type DieBuild } from "../engine/buildDie";
import type { DieInstance, LogoAsset } from "../engine/types";

let buildQueue: Promise<void> = Promise.resolve();

function enqueueBuild<T>(work: () => Promise<T>): Promise<T> {
  const run = buildQueue.then(work, work);
  buildQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

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
    enqueueBuild(() => buildDie(parsed, font, logos, globalScale, "preview"))
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
    return () => {
      alive = false;
    };
  }, [die, font, key, logos, logoKey, globalScale]);

  return { build, busy };
}
