// GET /api/health — confirms the app is up and can reach Postgres.
// Used by Geoff to verify the M1 database wiring, and later by uptime checks.
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic"; // never statically cached; always probe live.

export async function GET() {
  try {
    // Cheap round-trip plus a real table read, so the check fails if migrations
    // haven't run, not just if the connection is down.
    const result = await query<{ regions: string }>("select count(*)::text as regions from regions");
    return NextResponse.json({
      status: "ok",
      database: "connected",
      regions: Number(result.rows[0]?.regions ?? 0),
    });
  } catch (err) {
    // Log the real error server-side; return a generic message so we don't leak
    // connection details to the client.
    console.error("[health] database check failed:", err);
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}
