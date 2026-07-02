// Task detail: full record, one-tap complete/reopen, and (creator or PM+) edit
// of the scalar fields. Routes through getTaskIfVisible, so an out-of-scope task
// 404s rather than leaking.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { getTaskIfVisible, canActOnTasks } from "@/lib/tasks";
import { AppHeader } from "@/components/app-header";
import { PriorityBadge, CompleteForm } from "@/components/task-ui";
import { updateTaskAction } from "../actions";

export const dynamic = "force-dynamic";

const CADENCE_LABEL: Record<string, string> = {
  daily: "Daily",
  every_2_days: "Every 2 days",
  every_3_days: "Every 3 days",
  weekly: "Weekly",
};

function fmt(ts: string | null): string {
  return ts ? new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—";
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/");

  const task = await getTaskIfVisible(me, params.id);
  if (!task) notFound();

  const canAct = canActOnTasks(me);
  const canEdit = canAct && (task.created_by === me.id || hasRole(me, "property_manager"));

  return (
    <div className="min-h-screen bg-cg-cream">
      <AppHeader user={me} active="tasks" />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Link href="/tasks" className="text-sm text-cg-green hover:underline">
          ← Back to tasks
        </Link>

        {searchParams.error && (
          <p className="mt-3 rounded border border-cg-copper/40 bg-cg-copper/10 px-3 py-2 text-sm text-cg-ink/80">
            {searchParams.error}
          </p>
        )}

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-cg-green">{task.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <PriorityBadge priority={task.priority} />
              <span className="text-cg-ink/60">
                {task.is_complete ? "Completed" : "Open"}
              </span>
              {task.escalated_at && (
                <span className="rounded bg-cg-copper/15 px-1.5 py-0.5 text-[10px] font-medium text-cg-copper">
                  escalated
                </span>
              )}
            </div>
          </div>
          <CompleteForm taskId={task.id} isComplete={task.is_complete} canAct={canAct} />
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-cg-green/15 bg-white p-5 text-sm sm:grid-cols-2">
          <Field label="Property" value={task.property_name ?? "Corporate / standalone"} />
          <Field label="Assignee" value={task.assignee_label} />
          <Field label="Pings to" value={task.recipient_email ?? "— (no mailbox set)"} />
          <Field label="Cadence" value={CADENCE_LABEL[task.cadence] ?? task.cadence} />
          <Field label="Escalate after" value={`${task.escalation_threshold} pings`} />
          <Field label="Pings sent" value={String(task.ping_count)} />
          <Field label="Created by" value={`${task.creator_name ?? task.creator_email ?? "—"} · ${fmt(task.created_at)}`} />
          <Field
            label="Completed"
            value={task.is_complete ? `${task.completer_name ?? "—"} · ${fmt(task.completed_at)}` : "—"}
          />
        </dl>

        {task.notes && (
          <div className="mt-4 rounded-md border border-cg-green/15 bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-cg-ink/50">Notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-cg-ink/80">{task.notes}</p>
          </div>
        )}

        {canEdit && (
          <details className="mt-6 rounded-md border border-cg-green/15 bg-white p-5">
            <summary className="cursor-pointer text-sm font-medium text-cg-green">Edit task</summary>
            <form action={updateTaskAction} className="mt-4 space-y-4">
              <input type="hidden" name="taskId" value={task.id} />
              <label className="block">
                <span className="text-sm font-medium text-cg-green">Title</span>
                <input
                  name="title"
                  required
                  defaultValue={task.title}
                  className="mt-1 w-full rounded border border-cg-green/25 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-cg-green">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={task.notes ?? ""}
                  className="mt-1 w-full rounded border border-cg-green/25 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-cg-green">Priority</span>
                  <select
                    name="priority"
                    defaultValue={task.priority}
                    className="mt-1 w-full rounded border border-cg-green/25 px-2 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-cg-green">Cadence</span>
                  <select
                    name="cadence"
                    defaultValue={task.cadence}
                    className="mt-1 w-full rounded border border-cg-green/25 px-2 py-2 text-sm"
                  >
                    {Object.entries(CADENCE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-cg-green">Escalate after</span>
                  <input
                    type="number"
                    name="escalationThreshold"
                    min={1}
                    max={99}
                    defaultValue={task.escalation_threshold}
                    className="mt-1 w-full rounded border border-cg-green/25 px-2 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="rounded bg-cg-copper px-4 py-2 text-sm font-medium text-white hover:bg-cg-copper/90"
              >
                Save changes
              </button>
            </form>
          </details>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-cg-ink/50">{label}</dt>
      <dd className="mt-0.5 text-cg-ink/80">{value}</dd>
    </div>
  );
}
