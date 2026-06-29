// Edit one user's access: role, the user-management capability, active state, and
// property/region assignments. Viewing this admin detail is a sensitive read and
// is audited. The form posts to the updateUser server action, which re-checks
// authorization and enforces the escalation / self-lockout guards.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManageUsers } from "@/lib/auth";
import { writeAuditEntry } from "@/lib/audit";
import { query } from "@/lib/db";
import type { UserRole } from "@/lib/rbac";
import { updateUser } from "../../actions";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "read_only", label: "Read-only (no access)" },
  { value: "staff", label: "Staff (leasing / maintenance)" },
  { value: "assistant_property_manager", label: "Assistant Property Manager" },
  { value: "property_manager", label: "Property Manager" },
  { value: "regional_manager", label: "Regional Manager" },
  { value: "super_admin", label: "Super Admin" },
];

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const me = await requireManageUsers();
  const userId = params.id;

  const userResult = await query<{
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    can_manage_users: boolean;
    is_active: boolean;
  }>("select id, email, full_name, role, can_manage_users, is_active from users where id = $1", [
    userId,
  ]);
  if (userResult.rowCount === 0) notFound();
  const user = userResult.rows[0];

  const [regions, properties, propAssigned, regionAssigned] = await Promise.all([
    query<{ id: string; name: string }>("select id, name from regions order by name"),
    query<{ id: string; name: string; region_id: string }>(
      "select id, name, region_id from properties order by name",
    ),
    query<{ property_id: string }>(
      "select property_id from user_property_assignments where user_id = $1",
      [userId],
    ),
    query<{ region_id: string }>(
      "select region_id from user_region_assignments where user_id = $1",
      [userId],
    ),
  ]);

  await writeAuditEntry({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "admin.users.view",
    targetType: "user",
    targetId: userId,
  });

  const assignedProps = new Set(propAssigned.rows.map((r) => r.property_id));
  const assignedRegions = new Set(regionAssigned.rows.map((r) => r.region_id));
  const isSelf = userId === me.id;
  const iAmSuperAdmin = me.role === "super_admin";

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-cg-green hover:underline">
        ← Back to users
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-cg-green">{user.full_name ?? user.email}</h1>
      <p className="text-sm text-cg-ink/70">{user.email}</p>

      {(isSelf || !iAmSuperAdmin) && (
        <p className="mt-3 rounded border border-cg-copper/30 bg-cg-copper/5 px-3 py-2 text-xs text-cg-ink/70">
          {isSelf
            ? "This is your own account — you can change your assignments but not your own role, capability, or active status. Ask another admin for those."
            : "Only a Super Admin can grant Super Admin or the user-management capability; those controls are locked for you."}
        </p>
      )}

      <form action={updateUser} className="mt-6 space-y-6">
        <input type="hidden" name="userId" value={user.id} />

        <div className="rounded-md border border-cg-green/15 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-cg-green">Role</span>
              <select
                name="role"
                defaultValue={user.role}
                disabled={isSelf}
                className="mt-1 w-full rounded border border-cg-green/25 px-2 py-1.5 text-sm disabled:bg-cg-ink/5"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.value === "super_admin" && !iAmSuperAdmin}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col justify-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="canManageUsers"
                  defaultChecked={user.can_manage_users}
                  disabled={isSelf || !iAmSuperAdmin}
                />
                <span className="text-cg-ink/80">Can manage users</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={user.is_active}
                  disabled={isSelf}
                />
                <span className="text-cg-ink/80">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-cg-green/15 bg-white p-5">
          <h2 className="text-sm font-semibold text-cg-green">Region access</h2>
          <p className="mb-3 text-xs text-cg-ink/60">
            For regional managers — grants every property in the region.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {regions.rows.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="regionIds"
                  value={r.id}
                  defaultChecked={assignedRegions.has(r.id)}
                />
                <span className="text-cg-ink/80">{r.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-cg-green/15 bg-white p-5">
          <h2 className="text-sm font-semibold text-cg-green">Property access</h2>
          <p className="mb-3 text-xs text-cg-ink/60">
            For property managers, assistant PMs, and staff.
          </p>
          <div className="space-y-4">
            {regions.rows.map((region) => {
              const inRegion = properties.rows.filter((p) => p.region_id === region.id);
              if (inRegion.length === 0) return null;
              return (
                <div key={region.id}>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-cg-ink/50">
                    {region.name}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {inRegion.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="propertyIds"
                          value={p.id}
                          defaultChecked={assignedProps.has(p.id)}
                        />
                        <span className="text-cg-ink/80">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded bg-cg-copper px-4 py-2 text-sm font-medium text-white hover:bg-cg-copper/90"
          >
            Save changes
          </button>
          <Link href="/admin/users" className="text-sm text-cg-ink/60 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
