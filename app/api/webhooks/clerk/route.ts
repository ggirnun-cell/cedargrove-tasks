// POST /api/webhooks/clerk — mirrors Clerk user events into our `users` table.
//
// Signature-verified with Svix (Clerk's webhook signer); it does NOT rely on a
// session, which is why middleware lists it public. Provisioning goes through
// lib/auth.provisionUser, so the same default-deny / allow-policy rules apply
// here as on interactive sign-in.
import { Webhook } from "svix";
import { provisionUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs"; // needs pg + Node crypto, not the Edge runtime.
export const dynamic = "force-dynamic";

type ClerkEmail = { id: string; email_address: string };
type ClerkUserData = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmail[];
};
type ClerkEvent = { type: string; data: ClerkUserData };

function primaryEmail(data: ClerkUserData): string | null {
  const list = data.email_addresses ?? [];
  const primary = list.find((e) => e.id === data.primary_email_address_id) ?? list[0];
  return primary?.email_address ?? null;
}

export async function POST(req: Request): Promise<Response> {
  const secret = requireEnv("CLERK_WEBHOOK_SIGNING_SECRET");

  const payload = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  let event: ClerkEvent;
  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    // Bad/forged signature — reject without touching the database.
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      const email = primaryEmail(event.data);
      if (email) {
        const fullName =
          [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || null;
        await provisionUser({ email, fullName, clerkId: event.data.id });
      }
    } else if (event.type === "user.deleted") {
      // Deactivate rather than delete, to preserve task history/audit links.
      if (event.data.id) {
        await query("update users set is_active = false, updated_at = now() where clerk_id = $1", [
          event.data.id,
        ]);
      }
    }
    // Other event types are acknowledged and ignored.
  } catch (err) {
    console.error("[clerk webhook] handler error:", err);
    return new Response("Handler error", { status: 500 }); // Clerk will retry.
  }

  return new Response("ok", { status: 200 });
}
