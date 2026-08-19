import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Brand } from "../components/layout/Brand";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { InfoTip } from "../components/ui/InfoTip";
import { GoogleSignIn } from "../components/auth/GoogleSignIn";
import {
  canSubmitNewPassword,
  PasswordStrength,
  passwordsMatch,
} from "../components/auth/PasswordStrength";
import { PASSWORD_HINT, passwordIssues } from "../../shared/password";

export function Login() {
  return (
    <AuthScreen
      title="Return to the forge"
      lead="Sign in to pick up your last set, logos, and typefaces."
      submitLabel="Sign in"
      alt={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
      onSubmit={(input) => useAuthStore.getState().login(input)}
    />
  );
}

export function Signup() {
  return (
    <AuthScreen
      title="Claim a bench"
      lead="Your sets, crests, and fonts stay in your vault. Come back and the workshop remembers where you left off."
      submitLabel="Create account"
      showName
      alt={
        <>
          Already forging? <Link to="/login">Sign in</Link>
        </>
      }
      onSubmit={(input) => useAuthStore.getState().signup(input)}
    />
  );
}

function AuthScreen({
  title,
  lead,
  submitLabel,
  showName = false,
  alt,
  onSubmit,
}: {
  title: string;
  lead: string;
  submitLabel: string;
  showName?: boolean;
  alt: ReactNode;
  onSubmit: (input: { email: string; password: string; displayName: string }) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pendingEmail = useAuthStore((s) => s.pendingVerificationEmail);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const afterAuth = () => {
    if (useAuthStore.getState().pendingVerificationEmail) {
      setPassword("");
      setConfirm("");
      return;
    }
    const next = params.get("next");
    const last = useAuthStore.getState().session.lastPath;
    navigate(next || last || "/workshop", { replace: true });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (showName) {
      if (!passwordsMatch(password, confirm)) {
        setError("The two passwords do not match.");
        return;
      }
      const issues = passwordIssues(password);
      if (issues.length) {
        setError(issues[0]!);
        return;
      }
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await onSubmit({ email, password, displayName: displayName || email.split("@")[0] });
      afterAuth();
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setError(null);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const google = async (credential: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await useAuthStore.getState().loginWithGoogle(credential);
      afterAuth();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const target = pendingEmail || email;
    if (!target) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await useAuthStore.getState().resendVerification(target);
      setNotice("If an account needs confirmation, we sent a new link.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the email.");
    } finally {
      setBusy(false);
    }
  };

  const signupReady = !showName || canSubmitNewPassword(password, confirm);

  return (
    <div className="home auth-page">
      <nav className="home-nav">
        <Brand />
        <Link to="/workshop" className="btn">
          Continue as guest
        </Link>
      </nav>
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-copy">
            <p className="kicker">Account</p>
            <h1>{title}</h1>
            <p className="lede">{lead}</p>
          </div>
          <div className="auth-panel">
            {pendingEmail && (
              <div className="auth-notice" role="status">
                <p>
                  Confirm <strong>{pendingEmail}</strong> before using vault features. Check your inbox
                  for a link from Ready Writer One, then return here to sign in.
                </p>
                <button className="btn btn-gold" type="button" disabled={busy} onClick={() => void resend()}>
                  {busy ? "Working…" : "Resend confirmation email"}
                </button>
              </div>
            )}
            <form className="auth-form" onSubmit={(e) => void submit(e)}>
              {showName && (
                <label className="field">
                  <span>
                    Display name
                    <InfoTip text="How you appear in the workshop header and on your vault." />
                  </span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="nickname"
                    maxLength={40}
                  />
                </label>
              )}
              <label className="field">
                <span>
                  Email
                  <InfoTip text="The address you use to sign in to your DiceMaster vault." />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field">
                <span>
                  Password
                  <InfoTip text={showName ? PASSWORD_HINT : "The password for this vault account."} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={showName ? "new-password" : "current-password"}
                  minLength={showName ? 12 : 1}
                  required
                />
              </label>
              {showName && (
                <>
                  <PasswordStrength password={password} />
                  <label className="field">
                    <span>
                      Confirm password
                      <InfoTip text="Retype the same password so a mistype does not lock the vault." />
                    </span>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      minLength={12}
                      required
                    />
                  </label>
                  {confirm.length > 0 && !passwordsMatch(password, confirm) && (
                    <p className="form-error">The two passwords do not match.</p>
                  )}
                </>
              )}
              {notice && <p className="form-ok">{notice}</p>}
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-gold" type="submit" disabled={busy || !signupReady}>
                {busy ? "Working…" : submitLabel}
              </button>
            </form>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <GoogleSignIn onCredential={(credential) => void google(credential)} disabled={busy} />
            <p className="help">{alt}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
