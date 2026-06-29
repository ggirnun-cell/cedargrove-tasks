import { toggleCompleteAction } from "@/app/tasks/actions";
import type { TaskPriority } from "@/lib/tasks";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: "bg-cg-copper text-white",
  medium: "border border-cg-green/30 text-cg-green",
  low: "border border-cg-ink/15 text-cg-ink/60",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_STYLE[priority]}`}>
      {priority}
    </span>
  );
}

// Whole-days since an ISO timestamp, for the "age" column.
export function ageInDays(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function AgeLabel({ createdAt }: { createdAt: string }) {
  const d = ageInDays(createdAt);
  return <span className="text-cg-ink/60">{d === 0 ? "today" : `${d}d`}</span>;
}

// One-tap complete / reopen via the server action. `canAct` hides it from
// read-only viewers.
export function CompleteForm({
  taskId,
  isComplete,
  canAct,
}: {
  taskId: string;
  isComplete: boolean;
  canAct: boolean;
}) {
  if (!canAct) {
    return (
      <span className={isComplete ? "text-cg-green" : "text-cg-ink/50"}>
        {isComplete ? "Complete" : "Open"}
      </span>
    );
  }
  return (
    <form action={toggleCompleteAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="complete" value={String(!isComplete)} />
      <button
        type="submit"
        className={
          isComplete
            ? "rounded border border-cg-ink/20 px-2.5 py-1 text-xs font-medium text-cg-ink/60 hover:bg-cg-ink/5"
            : "rounded bg-cg-green px-2.5 py-1 text-xs font-medium text-white hover:bg-cg-green/90"
        }
      >
        {isComplete ? "Reopen" : "Complete"}
      </button>
    </form>
  );
}
