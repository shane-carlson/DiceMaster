import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export function UserLinks({ gold = false }: { gold?: boolean }) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const saveStatus = useAuthStore((s) => s.saveStatus);

  if (status === "bootstrapping") {
    return <span className="help">Restoring…</span>;
  }

  if (status === "signed-in" && user) {
    return (
      <div className="user-links">
        {saveStatus === "saving" && <span className="save-pill">Saving…</span>}
        {saveStatus === "saved" && <span className="save-pill">Vault synced</span>}
        {saveStatus === "error" && <span className="save-pill save-pill-warn">Vault offline</span>}
        {user.role === "admin" && (
          <Link to="/admin" className="btn btn-small">
            Admin
          </Link>
        )}
        <Link to="/account" className={gold ? "btn btn-gold btn-small" : "btn btn-small"}>
          {user.displayName}
        </Link>
      </div>
    );
  }

  return (
    <div className="user-links">
      <Link to="/login" className="btn btn-small">
        Sign in
      </Link>
      <Link to="/signup" className={gold ? "btn btn-gold btn-small" : "btn btn-small"}>
        Sign up
      </Link>
    </div>
  );
}
