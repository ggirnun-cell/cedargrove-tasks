import { SignUp } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";

// Sign-up screen. Sign-up is restricted to the two Workspace domains + the
// allowlist; that restriction is enforced both in the Clerk dashboard
// (Restrictions) and in our own code (lib/auth.isEmailAllowed), so a
// non-allowed account can never gain access even if it is created.
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cg-cream px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <BrandMark className="h-10 w-auto" />
        <p className="mt-3 text-sm font-semibold text-cg-green">Task Tracker</p>
        <p className="mt-1 text-sm text-cg-ink/70">Staff access only.</p>
      </div>
      <SignUp
        appearance={{
          variables: { colorPrimary: "#B36629" },
          elements: { card: "shadow-sm border border-cg-green/15" },
        }}
      />
    </main>
  );
}
