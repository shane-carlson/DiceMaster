import { inspectPassword, isPasswordAcceptable, passwordScore, passwordStrengthLabel, PASSWORD_HINT } from "../../../shared/password";

export function PasswordStrength({ password }: { password: string }) {
  const checks = inspectPassword(password);
  const score = passwordScore(password);
  const label = password ? passwordStrengthLabel(score) : "Choose a strong password";
  const rows: { ok: boolean; text: string }[] = [
    { ok: checks.length, text: "12 or more characters" },
    { ok: checks.lower && checks.upper, text: "Upper and lowercase letters" },
    { ok: checks.digit, text: "A number" },
    { ok: checks.symbol, text: "A symbol" },
  ];
  return (
    <div className="password-strength" aria-live="polite">
      <div className={`password-strength-bar score-${score}`} title={PASSWORD_HINT}>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={score >= n ? "on" : ""} />
        ))}
      </div>
      <p className={`password-strength-label score-${score}`}>{label}</p>
      <ul className="password-checks">
        {rows.map((row) => (
          <li key={row.text} className={row.ok ? "ok" : ""}>
            {row.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

export function canSubmitNewPassword(password: string, confirm: string): boolean {
  return isPasswordAcceptable(password) && passwordsMatch(password, confirm);
}
