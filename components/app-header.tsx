import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { BrandMark } from "./brand-mark";
import { canManageUsers } from "@/lib/rbac";
import type { AppUser } from "@/lib/auth";

// Shared top nav for the signed-in app. Server component (reads role to decide
// whether to show the Admin link).
export function AppHeader({
  user,
  active,
}: {
  user: AppUser;
  active?: "tasks" | "my" | "reports" | "admin";
}) {
  const cls = (key: string) =>
    `font-medium hover:underline ${active === key ? "text-cg-copper" : "text-cg-green"}`;
  return (
    <header className="border-b-2 border-cg-copper bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" aria-label="Home">
          <BrandMark className="h-9 w-auto" />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/tasks" className={cls("tasks")}>
            Tasks
          </Link>
          <Link href="/my-tasks" className={cls("my")}>
            My Tasks
          </Link>
          <Link href="/reports" className={cls("reports")}>
            Reports
          </Link>
          {canManageUsers(user) && (
            <Link href="/admin/users" className={cls("admin")}>
              Admin
            </Link>
          )}
          <SignOutButton>
            <button className="rounded border border-cg-green/30 px-3 py-1 text-xs font-medium text-cg-green hover:bg-cg-green/5">
              Sign out
            </button>
          </SignOutButton>
        </nav>
      </div>
    </header>
  );
}
