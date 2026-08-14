import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "../../shared/account";
import { api, ApiError } from "../api/client";
import { Brand } from "../components/layout/Brand";
import { useAuthStore } from "../store/authStore";

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.adminLogin({ email, password });
      await useAuthStore.getState().bootstrap();
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="home auth-page">
      <nav className="home-nav">
        <Brand />
        <Link to="/login" className="btn">
          User sign in
        </Link>
      </nav>
      <section className="auth-card">
        <p className="kicker">Staff</p>
        <h1>Admin console</h1>
        <p className="lede">
          Sign in with an administrator account to manage users, banners, fonts, and symbols.
        </p>
        <form className="auth-form" onSubmit={(e) => void submit(e)}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? "Working…" : "Enter console"}
          </button>
        </form>
        <p className="help">
          First-run default is <code>{DEFAULT_ADMIN_EMAIL}</code> / <code>{DEFAULT_ADMIN_PASSWORD}</code>.
          Change it after you sign in. Override with <code>ADMIN_EMAIL</code> and{" "}
          <code>ADMIN_PASSWORD</code> before the first boot.
        </p>
      </section>
    </div>
  );
}
