// Task list, filtered to exactly what the viewer may see (§5). This is where
// cross-property isolation becomes visible: a PM sees only their property's
// tasks, an RM their region, a super-admin everything.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { getVisibleTasks, canActOnTasks } from "@/lib/tasks";
import { AppHeader } from "@/components/app-header";
import { PriorityBadge, AgeLabel, CompleteForm } from "@/components/task-ui";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "open", label: "Open" },
  { key: "complete", label: "Completed" },
  { key: "all", label: "All" },
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/");

  const status: "open" | "complete" | "all" =
    searchParams.status === "complete" ? "complete" : searchParams.status === "all" ? "all" : "open";
  const tasks = await getVisibleTasks(me, { status });
  const canCreate = hasRole(me, "assistant_property_manager");
  const canAct = canActOnTasks(me);

  return (
    <div className="min-h-screen bg-cg-cream">
      <AppHeader user={me} active="tasks" />
      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-cg-green">Tasks</h1>
          {canCreate && (
            <Link
              href="/tasks/new"
              className="rounded bg-cg-copper px-3 py-1.5 text-sm font-medium text-white hover:bg-cg-copper/90"
            >
              + New task
            </Link>
          )}
        </div>

        <div className="mt-4 flex gap-2 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/tasks?status=${t.key}`}
              className={`rounded px-3 py-1 ${
                status === t.key
                  ? "bg-cg-green text-white"
                  : "border border-cg-green/25 text-cg-green hover:bg-cg-green/5"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-cg-green/15 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-green/15 bg-cg-green/5 text-left text-xs uppercase tracking-wide text-cg-ink/60">
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Property</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Assignee</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Age</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-cg-green/10 last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/tasks/${t.id}`} className="font-medium text-cg-green hover:underline">
                      {t.title}
                    </Link>
                    {t.escalated_at && (
                      <span className="ml-2 rounded bg-cg-copper/15 px-1.5 py-0.5 text-[10px] font-medium text-cg-copper">
                        escalated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-cg-ink/70">{t.property_name ?? "Corporate"}</td>
                  <td className="hidden px-4 py-2 text-cg-ink/70 md:table-cell">{t.assignee_label}</td>
                  <td className="px-4 py-2">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="hidden px-4 py-2 sm:table-cell">
                    <AgeLabel createdAt={t.created_at} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <CompleteForm taskId={t.id} isComplete={t.is_complete} canAct={canAct} />
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-cg-ink/50">
                    No tasks {status === "open" ? "open" : status === "complete" ? "completed" : ""} yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
