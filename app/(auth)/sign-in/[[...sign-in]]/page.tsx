import { SignIn } from "@clerk/nextjs";

// Sign-in screen. Which methods appear (Google for the two Workspace domains,
// email/password for invited outside users) is controlled in the Clerk
// dashboard, not here. Rendered at request time so the build needs no Clerk keys.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cg-cream px-4 py-10">
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-cg-green">Cedar Grove · Task Tracker</h1>
        <p className="mt-1 text-sm text-cg-ink/70">Sign in with your work Google account.</p>
      </div>
      <SignIn
        appearance={{
          variables: { colorPrimary: "#B36629" }, // copper accent
          elements: { card: "shadow-sm border border-cg-green/15" },
        }}
      />
    </main>
  );
}
