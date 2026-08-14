import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = Number(process.env.SCRYPT_N ?? 16384);

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N: SCRYPT_N, r: 8, p: 1 });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  if (!n || salt.length === 0 || expected.length === 0) return false;
  const hash = scryptSync(password, salt, expected.length, { N: n, r: 8, p: 1 });
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
