/** Vite base, e.g. "/" or "/sidequests/dicemaster/". */
export const BASE_URL = import.meta.env.BASE_URL || "/";
export const APP_BASE = BASE_URL.replace(/\/$/, "");

/** True when the workshop is nested on Ready Writer One. */
export const HOSTED_ON_RW1 = APP_BASE.startsWith("/sidequests");

/** Prefix a same-origin path with the deployed subdirectory, if any. */
export function withBase(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (!APP_BASE) return path;
  if (path === APP_BASE || path.startsWith(`${APP_BASE}/`)) return path;
  return `${APP_BASE}${path}`;
}
