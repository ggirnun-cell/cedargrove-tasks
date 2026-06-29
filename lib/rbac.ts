// SECURITY-CRITICAL (CLAUDE.md §12). Server-only.
//
// The role hierarchy and the §5 visibility rule. Two independent axes:
//   1. Property scope — WHICH properties a user can touch. Enforced via
//      getAllowedPropertyIds (lib/auth.ts); this file provides the role ranking
//      it builds on. This is the load-bearing cross-property isolation.
//   2. Function scope — WITHIN an accessible property, which tasks a user sees,
//      by job-function hierarchy. Pure logic here; wired to real task rows in M5.
import "server-only";
import type { AppUser } from "./auth";

// Mirrors the Postgres `user_role` enum, low → high.
export type UserRole =
  | "read_only"
  | "staff"
  | "assistant_property_manager"
  | "property_manager"
  | "regional_manager"
  | "super_admin";

// Mirrors the Postgres `job_function` enum.
export type JobFunction =
  | "property_manager"
  | "assistant_property_manager"
  | "leasing"
  | "maintenance";

// Higher number = more authority. Higher roles inherit lower-role permissions.
const ROLE_RANK: Record<UserRole, number> = {
  read_only: 0,
  staff: 1,
  assistant_property_manager: 2,
  property_manager: 3,
  regional_manager: 4,
  super_admin: 5,
};

// Does the user hold at least `minimum` in the role hierarchy?
export function hasRole(user: Pick<AppUser, "role">, minimum: UserRole): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

// Throw if the user is below `minimum`. Use to guard role-gated actions.
export function requireRole(user: Pick<AppUser, "role">, minimum: UserRole): void {
  if (!hasRole(user, minimum)) {
    throw new Error(`Forbidden: requires ${minimum} or higher.`);
  }
}

// May this user manage other users (grant access, assign roles/properties)?
// True for super_admins and for anyone with the explicit capability (Cara/Jackie
// per CLAUDE.md §4a). Sensitive — every use is audited in M4.
export function canManageUsers(user: Pick<AppUser, "role" | "canManageUsers">): boolean {
  return user.role === "super_admin" || user.canManageUsers;
}

// Within a single property, which task job-functions can a holder of `viewer`
// see? PM sees all; APM sees APM/leasing/maintenance (everything below PM);
// leasing/maintenance see only their own (siblings are not visible to each
// other). RM/super_admin are handled above the function level (they see every
// function in every property they can access), so they are not keyed here.
const FUNCTION_VISIBILITY: Record<JobFunction, JobFunction[]> = {
  property_manager: ["property_manager", "assistant_property_manager", "leasing", "maintenance"],
  assistant_property_manager: ["assistant_property_manager", "leasing", "maintenance"],
  leasing: ["leasing"],
  maintenance: ["maintenance"],
};

// Map an RBAC role to the job-function it implies, where unambiguous. `staff`
// is ambiguous (leasing vs maintenance), so the caller must supply the user's
// actual function at the property — see canViewTaskFunction.
function roleToFunction(role: UserRole): JobFunction | null {
  if (role === "property_manager") return "property_manager";
  if (role === "assistant_property_manager") return "assistant_property_manager";
  return null;
}

// Function-scope half of §5: can a viewer who already has property access see a
// task assigned to `taskFunction` at that property?
//   - regional_manager / super_admin: yes (they see every function in scope).
//   - property_manager: yes (sees every task at their property).
//   - assistant_property_manager / staff: by FUNCTION_VISIBILITY, using the
//     viewer's function at that property. For staff this MUST be provided
//     (leasing vs maintenance); M5 supplies it from the user's assignment.
export function canViewTaskFunction(opts: {
  role: UserRole;
  functionAtProperty?: JobFunction | null;
  taskFunction: JobFunction;
}): boolean {
  const { role, functionAtProperty, taskFunction } = opts;
  if (role === "super_admin" || role === "regional_manager" || role === "property_manager") {
    return true;
  }
  const viewerFunction = functionAtProperty ?? roleToFunction(role);
  if (!viewerFunction) return false; // unknown staff function → see nothing (deny by default).
  return FUNCTION_VISIBILITY[viewerFunction].includes(taskFunction);
}
