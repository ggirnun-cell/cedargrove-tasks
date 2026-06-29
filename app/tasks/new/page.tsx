// Create-task form. APM-and-above only. The assignee picker fans out to one
// instance per target on submit (CLAUDE.md §6).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { AppHeader } from "@/components/app-header";
import { AssigneePicker } from "@/components/assignee-picker";
import { createTaskAction } from "../actions";

export const dynamic = "force-dynamic";

const CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "every_2_days", label: "Every 2 days" },
  { value: "every_3_days", label: "Every 3 days" },
  { value: "weekly", label: "Weekly" },
];

export default async function NewTaskPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/");
  if (!hasRole(me, "assistant_property_manager")) redirect("/tasks");

  return (
    <div className="min-h-screen bg-cg-cream">
      <AppHeader user={me} active="tasks" />
      <main className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/tasks" className="text-sm text-cg-green hover:underline">
          ← Back to tasks
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-cg-green">New task</h1>

        <form action={createTaskAction} className="mt-5 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-cg-green">Title</span>
            <input
              name="title"
              required
              maxLength={200}
              className="mt-1 w-full rounded border border-cg-green/25 px-3 py-2 text-sm"
              placeholder="What needs to happen?"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-cg-green">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded border border-cg-green/25 px-3 py-2 text-sm"
              placeholder="Optional details. Do NOT include resident/applicant personal information."
            />
            <span className="mt-1 block text-xs text-cg-ink/50">
              Internal staff notes only — no tenant or applicant personal data.
            </span>
          </label>

          <div className="rounded-md border border-cg-green/15 bg-white p-4">
            <AssigneePicker />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-cg-green">Priority</span>
              <select
                name="priority"
                defaultValue="medium"
                className="mt-1 w-full rounded border border-cg-green/25 px-2 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-cg-green">Ping cadence</span>
              <select
                name="cadence"
                defaultValue="daily"
                className="mt-1 w-full rounded border border-cg-green/25 px-2 py-2 text-sm"
              >
                {CADENCES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-cg-green">Escalate after</span>
              <input
                type="number"
                name="escalationThreshold"
                defaultValue={3}
                min={1}
                max={99}
                className="mt-1 w-full rounded border border-cg-green/25 px-2 py-2 text-sm"
              />
              <span className="mt-1 block text-xs text-cg-ink/50">pings without completion</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-cg-copper px-4 py-2 text-sm font-medium text-white hover:bg-cg-copper/90"
            >
              Create task
            </button>
            <Link href="/tasks" className="text-sm text-cg-ink/60 hover:underline">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
