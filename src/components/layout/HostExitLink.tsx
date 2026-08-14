import { APP_BASE } from "../../appBase";

/** Leave the nested SPA and return to the Ready Writer One sidequests hub. */
export function HostExitLink() {
  if (!APP_BASE.startsWith("/sidequests")) return null;
  return (
    <a className="host-exit" href="/sidequests">
      Ready Writer One
    </a>
  );
}
