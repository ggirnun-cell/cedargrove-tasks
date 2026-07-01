// GET /api/assignees?q=... — type-ahead suggestions for the create-task assignee
// picker (CLAUDE.md §6a). Returns role mailboxes and directory people, SCOPED to
// the properties the requester can assign within (so the staff directory of
// other properties never leaks). The client may also enter a raw email directly.
import { NextResponse } from "next/server";
import { getCurrentUser, getAllowedPropertyIds } from "@/lib/auth";
import { hasRole, type JobFunction } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Suggestion = {
  kind: "role" | "person";
  label: string;
  recipientEmail: string | null;
  propertyId: string | null; // null for corporate / region-wide people
  jobFunction: JobFunction | null;
};

// Map a free-text directory function to one of the four assignable functions.
function mapFunction(text: string | null): JobFunction | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("assistant")) return "assistant_property_manager";
  if (t.includes("property_manager") || t.includes("property manager")) return "property_manager";
  if (t.includes("leasing")) return "leasing";
  if (t.includes("maintenance")) return "maintenance";
  return null;
}

const FUNCTION_LABEL: Record<JobFunction, string> = {
  property_manager: "Property Manager",
  assistant_property_manager: "Assistant PM",
  leasing: "Leasing",
  maintenance: "Maintenance",
};

export async function GET(request: Request): Promise<Response> {
  const me = await getCurrentUser();
  if (!me || !hasRole(me, "assistant_property_manager")) {
    return NextResponse.json({ suggestions: [] }, { status: me ? 403 : 401 });
  }

  const allowed = await getAllowedPropertyIds(me);
  if (allowed.length === 0) return NextResponse.json({ suggestions: [] });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  const like = `%${q}%`;
  const { query } = await import("@/lib/db");

  const roles = await query<{
    email: string;
    function: JobFunction;
    property_id: string;
    property_name: string;
  }>(
    `select rm.email, rm.function, p.id as property_id, p.name as property_name
       from role_mailboxes rm
       join properties p on p.id = rm.property_id
      where rm.property_id = any($1) and rm.email is not null and rm.is_active
        and (p.name ilike $2 or rm.email ilike $2 or rm.function::text ilike $2)
      order by p.name, rm.function
      limit 25`,
    [allowed, like],
  );

  const people = await query<{
    full_name: string;
    contact_email: string | null;
    function: string;
    property_id: string;
    property_name: string;
  }>(
    `select dp.full_name, dp.contact_email, dp.function, p.id as property_id, p.name as property_name
       from directory_people dp
       join properties p on p.id = dp.property_id
      where dp.property_id = any($1) and dp.is_vacant = false
        and (dp.full_name ilike $2 or dp.contact_email ilike $2 or p.name ilike $2)
      order by dp.full_name
      limit 25`,
    [allowed, like],
  );

  // Corporate + region-wide people (property_id null) — e.g. partners, regional
  // managers. Not property-scoped, so they aren't in the allowed-property joins
  // above; surfaced here so they can be assigned (a person target with no
  // property → a standalone task, creatable by super-admins).
  const corporate = await query<{
    full_name: string;
    contact_email: string | null;
    region_name: string | null;
  }>(
    `select dp.full_name, dp.contact_email, r.name as region_name
       from directory_people dp
       left join regions r on r.id = dp.region_id
      where dp.property_id is null
        and (dp.full_name ilike $1 or dp.contact_email ilike $1)
      order by dp.full_name
      limit 15`,
    [like],
  );

  const suggestions: Suggestion[] = [
    ...roles.rows.map((r) => ({
      kind: "role" as const,
      label: `${FUNCTION_LABEL[r.function]} @ ${r.property_name}`,
      recipientEmail: r.email,
      propertyId: r.property_id,
      jobFunction: r.function,
    })),
    ...people.rows.map((p) => ({
      kind: "person" as const,
      label: `${p.full_name} — ${p.property_name}${p.contact_email ? "" : " (no email)"}`,
      recipientEmail: p.contact_email,
      propertyId: p.property_id,
      jobFunction: mapFunction(p.function),
    })),
  ];

  // Dedupe corporate/region people by email (regional managers appear per region).
  const seen = new Set<string>();
  for (const c of corporate.rows) {
    const key = (c.contact_email ?? c.full_name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      kind: "person",
      label: `${c.full_name}${c.region_name ? ` — ${c.region_name} (regional)` : " (Corporate)"}${c.contact_email ? "" : " (no email)"}`,
      recipientEmail: c.contact_email,
      propertyId: null,
      jobFunction: null,
    });
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 40) });
}
