// User directory for admins. Listing users is a sensitive read (CLAUDE.md §12),
// so it is audited. Links to each user's access editor.
import Link from "next/link";
import { requireManageUsers } from "@/lib/auth";
import { writeAuditEntry } from "@/lib/audit";
import { query } from "@/lib/db";
import type { UserRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<UserRole, string> = {
  read_only: "Read-only",
  staff: "Staff",
  assistant_property_manager: "Assistant PM",
  property_manager: "Property Manager",
  regional_manager: "Regional Manager",
  super_admin: "Super Admin",
};

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  can_manage_users: boolean;
  is_active: boolean;
  property_count: number;
  region_count: number;
};

export default async function UsersPage() {
  const me = await requireManageUsers();

  const result = await query<Row>(`
    select u.id, u.email, u.full_name, u.role, u.can_manage_users, u.is_active,
           (select count(*)::int from user_property_assignments a where a.user_id = u.id) as property_count,
           (select count(*)::int from user_region_assignments r where r.user_id = u.id) as region_count
      from users u
     order by u.is_active desc, u.role desc, lower(coalesce(u.full_name, u.email))
  `);

  await writeAuditEntry({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "admin.users.view",
    targetType: "user_list",
    detail: { count: result.rowCount },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-cg-green">Users</h1>
      <p className="mt-1 text-sm text-cg-ink/70">
        Grant access by setting a role and assigning properties or regions. New sign-ins start as
        read-only with no access.
      </p>

      <div className="mt-5 overflow-hidden rounded-md border border-cg-green/15 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cg-green/15 bg-cg-green/5 text-left text-xs uppercase tracking-wide text-cg-ink/60">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Access</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((u) => (
              <tr key={u.id} className="border-b border-cg-green/10 last:border-0">
                <td className="px-4 py-2">
                  <div className="font-medium text-cg-ink">{u.full_name ?? "—"}</div>
                  <div className="text-xs text-cg-ink/60">{u.email}</div>
                </td>
                <td className="px-4 py-2">
                  {ROLE_LABELS[u.role]}
                  {u.can_manage_users && (
                    <span className="ml-1 rounded bg-cg-copper/15 px-1.5 py-0.5 text-[10px] font-medium text-cg-copper">
                      user mgmt
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-cg-ink/70">
                  {u.role === "super_admin"
                    ? "All properties"
                    : [
                        u.region_count ? `${u.region_count} region${u.region_count > 1 ? "s" : ""}` : null,
                        u.property_count
                          ? `${u.property_count} propert${u.property_count > 1 ? "ies" : "y"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "None"}
                </td>
                <td className="px-4 py-2">
                  {u.is_active ? (
                    <span className="text-cg-green">Active</span>
                  ) : (
                    <span className="text-cg-ink/40">Deactivated</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="rounded border border-cg-green/30 px-2.5 py-1 text-xs font-medium text-cg-green hover:bg-cg-green/5"
                  >
                    Manage
                  </Link>
                  {u.id === me.id && <span className="ml-2 text-[10px] text-cg-ink/40">you</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
