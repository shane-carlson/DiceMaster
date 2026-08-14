export const DEFAULT_DICEMASTER_FROM_EMAIL = "admin@readywriter.one";
export const DEFAULT_DICEMASTER_FROM_NAME = "Ready Writer One";

export function getDicemasterFromEmail(): string {
  return process.env.DICEMASTER_FROM_EMAIL?.trim() || DEFAULT_DICEMASTER_FROM_EMAIL;
}

export function getDicemasterFromName(): string {
  return process.env.DICEMASTER_FROM_NAME?.trim() || DEFAULT_DICEMASTER_FROM_NAME;
}

export type SendVerificationEmailResult =
  | { ok: true; id?: string }
  | { ok: false; reason: string; message: string };

export async function sendVerificationEmail(input: {
  to: string;
  displayName: string;
  verifyUrl: string;
}): Promise<SendVerificationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      reason: "not-configured",
      message: "RESEND_API_KEY is not set.",
    };
  }

  const fromEmail = getDicemasterFromEmail();
  const fromName = getDicemasterFromName();
  const subject = "Confirm your DiceMaster account";
  const name = input.displayName.trim() || "adventurer";
  const html = `
    <div style="font-family:Georgia,serif;line-height:1.5;color:#111;max-width:560px">
      <p>Hey ${escapeHtml(name)},</p>
      <p>
        Confirm this email to unlock your DiceMaster vault on Ready Writer One —
        saved sets, crests, typefaces, and the bench you left behind.
      </p>
      <p>
        <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
          Confirm email
        </a>
      </p>
      <p style="font-size:14px;color:#444">
        Or paste this URL into your browser:<br />
        <a href="${escapeHtml(input.verifyUrl)}">${escapeHtml(input.verifyUrl)}</a>
      </p>
      <p>This link expires in 48 hours. If you did not create an account, you can ignore this message.</p>
      <p>Ready Writer One</p>
    </div>
  `;
  const text = [
    `Hey ${name},`,
    "",
    "Confirm this email to unlock your DiceMaster vault on Ready Writer One.",
    "",
    input.verifyUrl,
    "",
    "This link expires in 48 hours. If you did not create an account, ignore this message.",
    "",
    "Ready Writer One",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [input.to],
        subject,
        html,
        text,
      }),
    });
    const detail = await response.text();
    if (!response.ok) {
      let message = detail.slice(0, 400) || `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(detail) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        /* keep text */
      }
      return { ok: false, reason: "http-error", message };
    }

    let id: string | undefined;
    try {
      const parsed = JSON.parse(detail) as { id?: string };
      id = parsed.id;
    } catch {
      /* ignore */
    }
    return { ok: true, id };
  } catch (error) {
    console.error("DiceMaster verification email failed", error);
    return {
      ok: false,
      reason: "network",
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
