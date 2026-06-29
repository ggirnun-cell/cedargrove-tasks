// Admin area chrome + the authorization gate. requireManageUsers redirects
// anyone without the capability before any admin page renders. Every server
// action re-checks independently (never trust this gate alone).
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { requireManageUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireManageUsers();

  return (
    <div className="min-h-screen bg-cg-cream">
      <header className="border-b-2 border-cg-copper bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <BrandMark className="h-9 w-auto" />
            </Link>
            <span className="border-l border-cg-green/20 pl-3 text-sm font-medium text-cg-green">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/users" className="font-medium text-cg-green hover:underline">
              Users
            </Link>
            <Link href="/admin/audit" className="font-medium text-cg-green hover:underline">
              Audit log
            </Link>
            <Link href="/" className="text-cg-ink/60 hover:underline">
              Exit
            </Link>
            <SignOutButton>
              <button className="rounded border border-cg-green/30 px-3 py-1 text-xs font-medium text-cg-green hover:bg-cg-green/5">
                Sign out
              </button>
            </SignOutButton>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
