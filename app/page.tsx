// M0 placeholder landing page. Confirms the staging deploy is live and on-brand.
// Real routes (sign-in, my-tasks, tasks, admin, reports) arrive in later
// milestones — nothing here is load-bearing.
export default function HomePage() {
  return (
    <main className="min-h-screen bg-cg-cream">
      <header className="bg-cg-green text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          {/* Logo slot — Geoff to drop public/cedar-grove-logo.svg (CLAUDE.md §9).
              Until then, a simple wordmark stands in. */}
          <span className="text-lg font-bold tracking-tight">Cedar Grove</span>
          <span className="text-sm text-cg-cream/80">Task Tracker</span>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-md border border-cg-green/15 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-cg-green">
            Staging is live
          </h1>
          <p className="mt-2 text-sm text-cg-ink/80">
            This is the empty scaffold (Milestone&nbsp;0). The interface,
            sign-in, and task features land in the next milestones. If you can
            read this on the Render staging URL, the deploy pipeline works.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-cg-green px-2 py-1 font-medium text-white">
              Next.js 14
            </span>
            <span className="rounded bg-cg-copper px-2 py-1 font-medium text-white">
              TypeScript
            </span>
            <span className="rounded border border-cg-green/30 px-2 py-1 font-medium text-cg-green">
              Tailwind · brand tokens
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs text-cg-ink/50">
          Internal use only · Cedar Grove Capital · Covenant Property Services
        </p>
      </section>
    </main>
  );
}
