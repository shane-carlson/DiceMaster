import { createPublicKey, verify } from "node:crypto";

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

const GOOGLE_ISS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

type GoogleJwk = {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
};

let cached: { keys: GoogleJwk[]; fetchedAt: number } | null = null;

function b64url(input: string): Buffer {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

async function googleCerts(): Promise<GoogleJwk[]> {
  if (cached && Date.now() - cached.fetchedAt < 60 * 60 * 1000) return cached.keys;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error("Could not reach Google sign-in.");
  const body = (await res.json()) as { keys?: GoogleJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new Error("Could not reach Google sign-in.");
  }
  cached = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

export function googleClientIdFromEnv(): string {
  return (process.env.GOOGLE_CLIENT_ID ?? process.env.DICEMASTER_GOOGLE_CLIENT_ID ?? "").trim();
}

export async function verifyGoogleIdToken(
  credential: string,
  clientId: string,
): Promise<GoogleIdentity> {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Google sign-in failed.");
  const header = JSON.parse(b64url(parts[0]!).toString()) as { kid?: string; alg?: string };
  const payload = JSON.parse(b64url(parts[1]!).toString()) as {
    iss?: string;
    aud?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean | string;
    sub?: string;
    name?: string;
  };
  if (header.alg !== "RS256") throw new Error("Google sign-in failed.");
  const keys = await googleCerts();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Google sign-in failed.");
  const key = createPublicKey({ key: jwk, format: "jwk" });
  const ok = verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, b64url(parts[2]!));
  if (!ok) throw new Error("Google sign-in failed.");
  if (!GOOGLE_ISS.has(payload.iss ?? "")) throw new Error("Google sign-in failed.");
  if (payload.aud !== clientId) throw new Error("Google sign-in failed.");
  if (!payload.exp || payload.exp * 1000 < Date.now() - 60_000) {
    throw new Error("Google sign-in expired. Try again.");
  }
  const email = (payload.email ?? "").trim().toLowerCase();
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (!email || !verified || !payload.sub) {
    throw new Error("Google did not provide a verified email.");
  }
  return { sub: payload.sub, email, emailVerified: true, name: payload.name };
}
