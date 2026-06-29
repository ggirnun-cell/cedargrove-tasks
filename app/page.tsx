// Protected landing. Middleware guarantees the visitor is signed in by the time
// they reach here. getCurrentUser then applies the database-level gate:
//   - null   → signed in but not provisioned/allowed/active → "no access" screen
//   - role read_only with no properties → the default-deny state every new
//     sign-in lands in until a super-admin grants access (CLAUDE.md §3)
// The full task UI replaces this in later milestones.
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  read_only: "Read-only",
  staff: "Staff",
  assistant_property_manager: "Assistant Property Manager",
  property_manager: "Property Manager",
  regional_manager: "Regional Manager",
  super_admin: "Super Admin",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cg-cream">
      <header className="border-b-2 border-cg-copper bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-auto" />
            <span className="hidden border-l border-cg-green/20 pl-3 text-sm font-medium text-cg-green sm:inline">
              Task Tracker
            </span>
          </div>
          <SignOutButton>
            <button className="rounded border border-cg-green/30 px-3 py-1 text-xs font-medium text-cg-green hover:bg-cg-green/5">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-5 py-10">{children}</section>
    </main>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();

  // Signed in, but not provisioned / not allowed / deactivated.
  if (!user) {
    return (
      <Shell>
        <div className="rounded-md border border-cg-green/15 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-cg-green">Access not set up yet</h1>
          <p className="mt-2 text-sm text-cg-ink/80">
            You&apos;re signed in, but your account doesn&apos;t have access to the task tracker
            yet. An administrator needs to grant it. If you just signed in for the first time, give
            it a moment and refresh — otherwise reach out to Geoff or an admin.
          </p>
        </div>
      </Shell>
    );
  }

  const isReadOnly = user.role === "read_only";
  return (
    <Shell>
      <div className="rounded-md border border-cg-green/15 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-cg-green">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-cg-ink/70">{user.email}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-cg-green px-2 py-1 font-medium text-white">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          {user.canManageUsers && (
            <span className="rounded bg-cg-copper px-2 py-1 font-medium text-white">
              Can manage users
            </span>
          )}
        </div>

        {isReadOnly ? (
          <p className="mt-5 text-sm text-cg-ink/80">
            Your account is active but has <strong>no property access yet</strong>. This is the
            default for every new sign-in — you&apos;ll see tasks once an administrator assigns you
            to a property or role.
          </p>
        ) : (
          <p className="mt-5 text-sm text-cg-ink/80">
            Your access is provisioned. Task lists and creation arrive in the next milestone.
          </p>
        )}

        {canManageUsers(user) && (
          <div className="mt-5 border-t border-cg-green/10 pt-4">
            <Link
              href="/admin/users"
              className="inline-block rounded bg-cg-green px-3 py-1.5 text-sm font-medium text-white hover:bg-cg-green/90"
            >
              Manage users & access →
            </Link>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-cg-ink/50">
        Internal use only · Cedar Grove Capital · Covenant Property Services
      </p>
    </Shell>
  );
}
