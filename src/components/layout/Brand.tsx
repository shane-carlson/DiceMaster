import { Link } from "react-router-dom";

export function Brand({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="brand">
      <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
        <path
          d="M32 8 L56 22 L56 42 L32 56 L8 42 L8 22 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
      </svg>
      <span className="brand-name">DICEMASTER</span>
    </Link>
  );
}
