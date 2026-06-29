// Email sending (Resend). Minimal in M5 — used for the "task complete → notify
// creator" message. M6 builds the daily digest + escalation on top of this.
//
// If Resend isn't configured yet (no RESEND_API_KEY / MAIL_FROM), sends are
// logged and skipped so the app works locally and before domain verification.
import "server-only";
import { optionalEnv } from "./env";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("MAIL_FROM");

  if (!apiKey || !from) {
    console.log(
      `[email skipped — Resend not configured] to=${message.to} subject=${JSON.stringify(message.subject)}`,
    );
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
    }),
  });

  if (!response.ok) {
    console.error(`[email] Resend error ${response.status}: ${await response.text()}`);
    return { sent: false };
  }
  return { sent: true };
}

export function appUrl(path = "/"): string {
  const base = optionalEnv("APP_BASE_URL")?.replace(/\/$/, "") ?? "";
  return `${base}${path}`;
}
