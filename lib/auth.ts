// SECURITY-CRITICAL (CLAUDE.md §12). Server-only.
//
// Owns: who is allowed to have an account at all (domain + allowlist), how a
// Clerk identity maps to our `users` row, and the default-deny provisioning of
// new sign-ins as `read_only`. getAllowedPropertyIds (the property-visibility
// half of §5) arrives in M3 (lib/rbac.ts + here) — not yet present.
import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { query } from "./db";
import type { UserRole } from "./rbac";

// Role hierarchy lives in lib/rbac.ts; re-exported here for existing importers.
export type { UserRole };

// The two Google Workspace domains that may self-register (CLAUDE.md §3).
export const ALLOWED_SIGNUP_DOMAINS = [
  "cedargrovecp.com",
  "covenantpropertyservices.com",
] as const;

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  canManageUsers: boolean;
  isActive: boolean;
};

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  can_manage_users: boolean;
  is_active: boolean;
};

function mapRow(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    canManageUsers: row.can_manage_users,
    isActive: row.is_active,
  };
}

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase();
}

// Is this email permitted to have an account? Workspace domains always; any
// other address only if explicitly allowlisted (CLAUDE.md §3, SEED_DATA §8).
export async function isEmailAllowed(email: string): Promise<boolean> {
  if ((ALLOWED_SIGNUP_DOMAINS as readonly string[]).includes(emailDomain(email))) {
    return true;
  }
  const result = await query("select 1 from email_allowlist where email = $1", [email]);
  return (result.rowCount ?? 0) > 0;
}

// Create-or-link a user row for an allowed email. Default-deny: brand-new users
// are `read_only`. Existing rows (e.g. seeded super-admins) keep their role and
// active state — this NEVER reactivates a deactivated account or changes a role,
// it only links the Clerk id and refreshes the display name. Returns null if the
// email is not allowed (no account is created).
export async function provisionUser(params: {
  email: string;
  fullName: string | null;
  clerkId: string | null;
}): Promise<AppUser | null> {
  const { email, fullName, clerkId } = params;
  if (!(await isEmailAllowed(email))) return null;

  const result = await query<UserRow>(
    `insert into users (email, full_name, clerk_id, role, is_active)
       values ($1, $2, $3, 'read_only', true)
     on conflict (email) do update set
       full_name  = coalesce(excluded.full_name, users.full_name),
       clerk_id   = coalesce(users.clerk_id, excluded.clerk_id),
       updated_at = now()
     returning id, email, full_name, role, can_manage_users, is_active`,
    [email, fullName, clerkId],
  );
  return mapRow(result.rows[0]);
}

// The authenticated app user, or null if not signed in / not provisioned /
// not allowed / deactivated. Callers treat null as "no access". Lazily links the
// Clerk id and provisions allowed first-time users, so access does not depend on
// the webhook having fired yet.
export async function getCurrentUser(): Promise<AppUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    null;
  if (!email) return null;

  const existing = await query<UserRow & { clerk_id: string | null }>(
    `select id, email, full_name, role, can_manage_users, is_active, clerk_id
       from users where email = $1`,
    [email],
  );

  if ((existing.rowCount ?? 0) > 0) {
    const row = existing.rows[0];
    if (!row.is_active) return null; // deliberately deactivated → no access.
    if (!row.clerk_id) {
      // First sign-in for a seeded account: link the Clerk id once.
      await query("update users set clerk_id = $1, updated_at = now() where id = $2 and clerk_id is null", [
        clerkUser.id,
        row.id,
      ]);
    }
    return mapRow(row);
  }

  // Not in our table yet: provision if allowed (read_only), else deny.
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const provisioned = await provisionUser({ email, fullName, clerkId: clerkUser.id });
  return provisioned && provisioned.isActive ? provisioned : null;
}

// SECURITY-CRITICAL (CLAUDE.md §5, §12). The set of property IDs this user may
// access — the property-scope half of the visibility rule. EVERY property-scoped
// query MUST filter by this; a query that bypasses it is a cross-property leak.
//   - super_admin: every property (corporate sees all).
//   - regional_manager: all properties in their assigned region(s), plus any
//     directly-assigned properties.
//   - property_manager / assistant_property_manager / staff / read_only: only
//     their directly-assigned properties (none by default → sees nothing).
// Re-queries live data each call, so newly-created properties are reflected.
export async function getAllowedPropertyIds(user: Pick<AppUser, "id" | "role">): Promise<string[]> {
  if (user.role === "super_admin") {
    const all = await query<{ id: string }>("select id from properties");
    return all.rows.map((row) => row.id);
  }

  const ids = new Set<string>();

  if (user.role === "regional_manager") {
    const byRegion = await query<{ id: string }>(
      `select p.id
         from properties p
         join user_region_assignments ura on ura.region_id = p.region_id
        where ura.user_id = $1`,
      [user.id],
    );
    for (const row of byRegion.rows) ids.add(row.id);
  }

  const direct = await query<{ property_id: string }>(
    "select property_id from user_property_assignments where user_id = $1",
    [user.id],
  );
  for (const row of direct.rows) ids.add(row.property_id);

  return [...ids];
}

// Convenience guard for a single property. Prefer fetching getAllowedPropertyIds
// once when checking many rows.
export async function canAccessProperty(
  user: Pick<AppUser, "id" | "role">,
  propertyId: string,
): Promise<boolean> {
  if (user.role === "super_admin") return true;
  return (await getAllowedPropertyIds(user)).includes(propertyId);
}
