// "My tasks" — open tasks routed to the current user's address, for quick
// one-tap completion (CLAUDE.md §14 / the assignee view).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyOpenTasks, canActOnTasks } from "@/lib/tasks";
import { AppHeader } from "@/components/app-header";
import { PriorityBadge, AgeLabel, CompleteForm } from "@/components/task-ui";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/");

  const tasks = await getMyOpenTasks(me);
  const canAct = canActOnTasks(me);

  return (
    <div className="min-h-screen bg-cg-cream">
      <AppHeader user={me} active="my" />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-xl font-semibold text-cg-green">My open tasks</h1>
        <p className="mt-1 text-sm text-cg-ink/70">Tasks addressed to {me.email}.</p>

        <ul className="mt-5 space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md border border-cg-green/15 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <Link href={`/tasks/${t.id}`} className="font-medium text-cg-green hover:underline">
                  {t.title}
                </Link>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-cg-ink/60">
                  <PriorityBadge priority={t.priority} />
                  <span>{t.property_name ?? "Corporate"}</span>
                  <span>·</span>
                  <AgeLabel createdAt={t.created_at} />
                </div>
              </div>
              <CompleteForm taskId={t.id} isComplete={t.is_complete} canAct={canAct} />
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="rounded-md border border-cg-green/15 bg-white px-4 py-8 text-center text-sm text-cg-ink/50">
              Nothing open addressed to you. 🎉
            </li>
          )}
        </ul>
      </main>
    </div>
  );
}
