"use server";

// SECURITY-CRITICAL (CLAUDE.md §4a, §12). Admin mutations: grant access, set
// role/capability/active, and sync property/region assignments — all atomic and
// audited. Re-checks authorization itself (never trusts the page gate).
import { revalidatePath } from "next/cache";
import { requireManageUsers } from "@/lib/auth";
import { writeAuditEntry } from "@/lib/audit";
import { withTransaction } from "@/lib/db";
import type { UserRole } from "@/lib/rbac";

const VALID_ROLES: UserRole[] = [
  "read_only",
  "staff",
  "assistant_property_manager",
  "property_manager",
  "regional_manager",
  "super_admin",
];

type TargetState = {
  role: UserRole;
  can_manage_users: boolean;
  is_active: boolean;
  properties: string[];
  regions: string[];
};

export async function updateUser(formData: FormData): Promise<void> {
  const me = await requireManageUsers();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Missing userId");

  const requestedRole = String(formData.get("role") ?? "");
  const role: UserRole = (VALID_ROLES as string[]).includes(requestedRole)
    ? (requestedRole as UserRole)
    : "read_only";
  const requestedCanManage = formData.get("canManageUsers") === "on";
  const requestedActive = formData.get("isActive") === "on";
  const propertyIds = formData.getAll("propertyIds").map(String);
  const regionIds = formData.getAll("regionIds").map(String);

  const isSelf = userId === me.id;
  const iAmSuperAdmin = me.role === "super_admin";

  await withTransaction(async (client) => {
    // Load current state for diffing/audit and to enforce guards against it.
    const before = await loadTargetState(client, userId);
    if (!before) throw new Error("User not found");

    // --- authorization guards -------------------------------------------------
    // 1. Privilege escalation: only a super_admin may grant super_admin or the
    //    can_manage_users capability. Lesser admins keep those fields unchanged.
    let nextRole = role;
    let nextCanManage = requestedCanManage;
    if (!iAmSuperAdmin) {
      if (nextRole === "super_admin") nextRole = before.role; // cannot promote to super_admin
      nextCanManage = before.can_manage_users; // cannot change the capability
    }
    // 2. Self-lockout: you cannot change your own role / capability / active
    //    state (ask another admin) — prevents removing your own access.
    let nextActive = requestedActive;
    if (isSelf) {
      nextRole = before.role;
      nextCanManage = before.can_manage_users;
      nextActive = before.is_active;
    }

    // --- apply ----------------------------------------------------------------
    await client.query(
      "update users set role = $1, can_manage_users = $2, is_active = $3, updated_at = now() where id = $4",
      [nextRole, nextCanManage, nextActive, userId],
    );

    // Re-sync assignments to exactly the submitted sets (idempotent diff).
    await syncAssignments(client, "user_property_assignments", "property_id", userId, propertyIds);
    await syncAssignments(client, "user_region_assignments", "region_id", userId, regionIds);

    // --- audit (same transaction) --------------------------------------------
    await writeAuditEntry(
      {
        actorUserId: me.id,
        actorEmail: me.email,
        action: "user.update",
        targetType: "user",
        targetId: userId,
        detail: {
          self: isSelf,
          before: {
            role: before.role,
            can_manage_users: before.can_manage_users,
            is_active: before.is_active,
            properties: before.properties,
            regions: before.regions,
          },
          after: {
            role: nextRole,
            can_manage_users: nextCanManage,
            is_active: nextActive,
            properties: [...propertyIds].sort(),
            regions: [...regionIds].sort(),
          },
        },
      },
      client,
    );
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

async function loadTargetState(
  client: import("pg").PoolClient,
  userId: string,
): Promise<TargetState | null> {
  const u = await client.query<{ role: UserRole; can_manage_users: boolean; is_active: boolean }>(
    "select role, can_manage_users, is_active from users where id = $1",
    [userId],
  );
  if (u.rowCount === 0) return null;
  const props = await client.query<{ property_id: string }>(
    "select property_id from user_property_assignments where user_id = $1",
    [userId],
  );
  const regions = await client.query<{ region_id: string }>(
    "select region_id from user_region_assignments where user_id = $1",
    [userId],
  );
  return {
    role: u.rows[0].role,
    can_manage_users: u.rows[0].can_manage_users,
    is_active: u.rows[0].is_active,
    properties: props.rows.map((r) => r.property_id).sort(),
    regions: regions.rows.map((r) => r.region_id).sort(),
  };
}

// Replace the rows in a join table for this user with exactly `ids`.
async function syncAssignments(
  client: import("pg").PoolClient,
  table: "user_property_assignments" | "user_region_assignments",
  column: "property_id" | "region_id",
  userId: string,
  ids: string[],
): Promise<void> {
  await client.query(`delete from ${table} where user_id = $1`, [userId]);
  const unique = [...new Set(ids)];
  for (const id of unique) {
    await client.query(
      `insert into ${table} (user_id, ${column}) values ($1, $2) on conflict do nothing`,
      [userId, id],
    );
  }
}
