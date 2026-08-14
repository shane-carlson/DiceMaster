export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

const COMMON = new Set(
  [
    "password",
    "password123",
    "password1234",
    "123456789012",
    "qwertyuiopas",
    "letmein12345",
    "welcome12345",
    "adminadmin12",
    "iloveyou1234",
    "monkey123456",
    "dicemaster12",
    "readywriter1",
    "forgemaster1",
    "changeme1234",
    "passw0rd1234",
  ].map((s) => s.toLowerCase()),
);

export type PasswordChecks = {
  length: boolean;
  lower: boolean;
  upper: boolean;
  digit: boolean;
  symbol: boolean;
  uncommon: boolean;
};

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export function inspectPassword(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    uncommon: password.length > 0 && !COMMON.has(password.toLowerCase()),
  };
}

export function passwordIssues(password: string, label = "Password"): string[] {
  const checks = inspectPassword(password);
  const issues: string[] = [];
  if (!checks.length) {
    issues.push(`${label} must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (!checks.lower || !checks.upper) {
    issues.push(`${label} needs both uppercase and lowercase letters.`);
  }
  if (!checks.digit) issues.push(`${label} needs a number.`);
  if (!checks.symbol) issues.push(`${label} needs a symbol.`);
  if (!checks.uncommon) issues.push(`${label} is too common.`);
  return issues;
}

export function isPasswordAcceptable(password: string): boolean {
  const checks = inspectPassword(password);
  return checks.length && checks.lower && checks.upper && checks.digit && checks.symbol && checks.uncommon;
}

export function passwordScore(password: string): PasswordScore {
  if (!password) return 0;
  const checks = inspectPassword(password);
  const classes = [checks.lower, checks.upper, checks.digit, checks.symbol].filter(Boolean).length;
  if (password.length < 8 || classes < 2) return 1;
  if (!isPasswordAcceptable(password)) return 2;
  if (password.length >= 16 && classes === 4) return 4;
  return 3;
}

export function passwordStrengthLabel(score: PasswordScore): string {
  switch (score) {
    case 0:
      return "Enter a password";
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Strong";
  }
}

export const PASSWORD_HINT =
  "At least 12 characters, with uppercase, lowercase, a number, and a symbol.";
