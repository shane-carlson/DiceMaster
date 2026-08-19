import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { Brand } from "../components/layout/Brand";
import { useAuthStore } from "../store/authStore";

export function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const token = params.get("token")?.trim() ?? "";
    if (!token) {
      setError("This confirmation link is missing a token.");
      setBusy(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await useAuthStore.getState().verifyEmail(token);
        if (!cancelled) navigate("/workshop", { replace: true });
      } catch (err) {
        const auth = useAuthStore.getState();
        if (auth.status === "signed-in" && auth.user?.emailVerified) {
          if (!cancelled) navigate("/workshop", { replace: true });
          return;
        }
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not confirm that email.");
          setBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

  return (
    <div className="home auth-page">
      <nav className="home-nav">
        <Brand />
        <Link to="/login" className="btn">
          Sign in
        </Link>
      </nav>
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-copy">
            <p className="kicker">Account</p>
            <h1>Confirm email</h1>
            {busy && !error && <p className="lede">Confirming your DiceMaster account…</p>}
          </div>
          <div className="auth-panel">
            {error && (
              <>
                <p className="form-error">{error}</p>
                <p className="help">
                  Request a new link from <Link to="/login">sign in</Link>, then check your inbox.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
