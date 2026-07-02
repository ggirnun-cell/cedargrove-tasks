// M7 — Reports. Outstanding and Completed views, filtered by property / region /
// person / priority and date range (CLAUDE.md §8). Respects the §5 visibility
// rule (via getReport), so each user only reports on tasks they can see.
// Completed rows show time-to-complete. Filters live in the URL (GET form), so
// reports are shareable/bookmarkable.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAllowedPropertyIds } from "@/lib/auth";
import { getReport, type ReportFilter, type TaskPriority } from "@/lib/tasks";
import { query } from "@/lib/db";
import { AppHeader } from "@/components/app-header";
import { PriorityBadge, timeToComplete } from "@/components/task-ui";

export const dynamic = "force-dynamic";

function fmtDate(ts: string): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/");

  const status: "outstanding" | "completed" =
    searchParams.status === "completed" ? "completed" : "outstanding";
  const priorityParam = searchParams.priority;
  const priority: TaskPriority | undefined =
    priorityParam === "low" || priorityParam === "medium" || priorityParam === "high"
      ? priorityParam
      : undefined;

  const filter: ReportFilter = {
    status,
    propertyId: searchParams.property || undefined,
    regionId: searchParams.region || undefined,
    person: searchParams.person || undefined,
    priority,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
  };

  // Filter option lists, scoped to what the user can see.
  const allowed = await getAllowedPropertyIds(me);
  const isSuper = me.role === "super_admin";
  const [properties, regions, rows] = await Promise.all([
    query<{ id: string; name: string }>(
      isSuper
        ? "select id, name from properties order by name"
        : "select id, name from properties where id = any($1) order by name",
      isSuper ? [] : [allowed],
    ),
    query<{ id: string; name: string }>("select id, name from regions order by name"),
    getReport(me, filter),
  ]);

  const completed = status === "completed";
  const inputCls = "rounded border border-cg-green/25 px-2 py-1.5 text-sm";

  return (
    <div className="min-h-screen bg-cg-cream">
      <AppHeader user={me} active="reports" />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="text-xl font-semibold text-cg-green">Reports</h1>

        {/* Status toggle */}
        <div className="mt-4 flex gap-2 text-sm">
          {(["outstanding", "completed"] as const).map((s) => (
            <Link
              key={s}
              href={`/reports?status=${s}`}
              className={`rounded px-3 py-1 capitalize ${
                status === s
                  ? "bg-cg-green text-white"
                  : "border border-cg-green/25 text-cg-green hover:bg-cg-green/5"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* Filters (GET form → URL params) */}
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-cg-green/15 bg-white p-4">
          <input type="hidden" name="status" value={status} />
          <label className="flex flex-col gap-1 text-xs text-cg-ink/60">
            Property
            <select name="property" defaultValue={filter.propertyId ?? ""} className={inputCls}>
              <option value="">All</option>
              {properties.rows.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cg-ink/60">
            Region
            <select name="region" defaultValue={filter.regionId ?? ""} className={inputCls}>
              <option value="">All</option>
              {regions.rows.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cg-ink/60">
            Priority
            <select name="priority" defaultValue={filter.priority ?? ""} className={inputCls}>
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-cg-ink/60">
            Person (email)
            <input name="person" defaultValue={filter.person ?? ""} placeholder="contains…" className={inputCls} />
          </label>
          <div className="flex flex-col gap-1 text-xs text-cg-ink/60">
            {completed ? "Completed date range" : "Created date range"}
            <div className="flex items-center gap-2">
              <input type="date" name="from" defaultValue={filter.from ?? ""} className={inputCls} aria-label="From date" />
              <span className="text-cg-ink/40">–</span>
              <input type="date" name="to" defaultValue={filter.to ?? ""} className={inputCls} aria-label="To date" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-cg-copper px-3 py-1.5 text-sm font-medium text-white hover:bg-cg-copper/90">
              Apply
            </button>
            <Link href={`/reports?status=${status}`} className="rounded border border-cg-green/25 px-3 py-1.5 text-sm text-cg-green hover:bg-cg-green/5">
              Clear
            </Link>
          </div>
        </form>

        <p className="mt-4 text-sm text-cg-ink/60">
          {rows.length} {completed ? "completed" : "outstanding"} task{rows.length === 1 ? "" : "s"}
          {rows.length === 1000 ? " (showing first 1000)" : ""}
        </p>

        <div className="mt-2 overflow-x-auto rounded-md border border-cg-green/15 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-green/15 bg-cg-green/5 text-left text-xs uppercase tracking-wide text-cg-ink/60">
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Property</th>
                <th className="px-4 py-2 font-medium">Assignee</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Created</th>
                {completed ? (
                  <>
                    <th className="px-4 py-2 font-medium">Completed</th>
                    <th className="px-4 py-2 font-medium">Time to complete</th>
                  </>
                ) : (
                  <th className="px-4 py-2 font-medium">Pings</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-cg-green/10 last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/tasks/${t.id}`} className="font-medium text-cg-green hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-cg-ink/70">{t.property_name ?? "Corporate"}</td>
                  <td className="px-4 py-2 text-cg-ink/70">{t.assignee_label}</td>
                  <td className="px-4 py-2"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-2 text-cg-ink/60">{fmtDate(t.created_at)}</td>
                  {completed ? (
                    <>
                      <td className="px-4 py-2 text-cg-ink/60">{t.completed_at ? fmtDate(t.completed_at) : "—"}</td>
                      <td className="px-4 py-2 text-cg-ink/80">{timeToComplete(t.created_at, t.completed_at)}</td>
                    </>
                  ) : (
                    <td className="px-4 py-2 text-cg-ink/60">
                      {t.ping_count}
                      {t.escalated_at && (
                        <span className="ml-1 rounded bg-cg-copper/15 px-1 text-[10px] font-medium text-cg-copper">esc</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={completed ? 7 : 6} className="px-4 py-8 text-center text-sm text-cg-ink/50">
                    No matching tasks.
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
