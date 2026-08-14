import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: "popup";
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiLoading) return gsiLoading;
  gsiLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-gsi]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.gsi = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      gsiLoading = null;
      reject(new Error("Could not load Google sign-in."));
    };
    document.head.appendChild(script);
  });
  return gsiLoading;
}

export function GoogleSignIn({
  onCredential,
  disabled = false,
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await api.googleConfig();
        if (!config.enabled || !config.clientId) return;
        await loadGsi();
        if (cancelled || !host.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: (response) => callback.current(response.credential),
          ux_mode: "popup",
          auto_select: false,
        });
        const width = Math.min(360, Math.max(240, host.current.clientWidth || 320));
        window.google.accounts.id.renderButton(host.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width,
        });
        setAvailable(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Google sign-in is unavailable.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="help">{error}</p>;
  }
  return (
    <div className={`google-sign-in ${disabled ? "is-disabled" : ""} ${available ? "is-ready" : ""}`}>
      <div ref={host} className="google-sign-in-host" />
    </div>
  );
}
