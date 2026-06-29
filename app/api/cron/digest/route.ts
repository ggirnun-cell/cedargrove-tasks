// POST/GET /api/cron/digest — runs the daily ping + escalation engine.
// Authenticated by a shared CRON_SECRET (Bearer header or ?secret=), NOT a user
// session, so it's listed public in middleware. The Render cron job calls it
// each morning; it can also be triggered manually for testing.
import { NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";
import { runDailyDigest } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // allow time for many sends

function isAuthorized(req: Request): boolean {
  const secret = requireEnv("CRON_SECRET");
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
}

async function run(req: Request): Promise<Response> {
  if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const result = await runDailyDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/digest] failed:", err);
    return NextResponse.json({ ok: false, error: "digest failed" }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
