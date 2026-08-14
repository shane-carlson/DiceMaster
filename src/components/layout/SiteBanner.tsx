import { useMemo, useState } from "react";
import { useCatalogStore } from "../../store/catalogStore";

const DISMISS_KEY = "dm_banner_dismissed";

function dismissedIds(): string[] {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function SiteBanner() {
  const announcements = useCatalogStore((s) => s.announcements);
  const [hidden, setHidden] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : dismissedIds(),
  );

  const visible = useMemo(
    () => announcements.filter((a) => a.active && !hidden.includes(a.id)),
    [announcements, hidden],
  );

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...hidden, id];
    setHidden(next);
    try {
      sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="site-banners">
      {visible.map((a) => (
        <div key={a.id} className={`site-banner site-banner-${a.tone}`} role="status">
          <p>{a.message}</p>
          <button className="banner-dismiss" onClick={() => dismiss(a.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
