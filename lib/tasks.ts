// SECURITY-CRITICAL (CLAUDE.md §5, §6, §8). Server-only.
//
// The task data layer: visibility-filtered reads, fan-out creation, and
// completion. Every read routes through the §5 visibility rule (property scope
// from getAllowedPropertyIds + the function/role narrowing here). No task query
// outside this module may bypass it.
import "server-only";
import { randomUUID } from "node:crypto";
import { query, withTransaction } from "./db";
import { getAllowedPropertyIds, type AppUser } from "./auth";
import { hasRole, requireRole, type JobFunction, type UserRole } from "./rbac";
import { writeAuditEntry } from "./audit";
import { sendEmail, appUrl } from "./email";
import { sendCreationPings } from "./digest";

export type TaskPriority = "low" | "medium" | "high";
export type PingCadence = "daily" | "every_2_days" | "every_3_days" | "weekly";

export type TaskRow = {
  id: string;
  origin_id: string;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  cadence: PingCadence;
  escalation_threshold: number;
  property_id: string | null;
  property_name: string | null;
  region_id: string | null;
  job_function: JobFunction | null;
  assignee_label: string;
  recipient_email: string | null;
  created_by: string;
  creator_name: string | null;
  creator_email: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  completer_name: string | null;
  is_complete: boolean;
  escalated_at: string | null;
  last_ping_at: string | null;
  ping_count: number;
};

const SELECT = `
  select t.id, t.origin_id, t.title, t.notes, t.priority, t.cadence, t.escalation_threshold,
         t.property_id, p.name as property_name, t.region_id, t.job_function,
         t.assignee_label, t.recipient_email,
         t.created_by, c.full_name as creator_name, c.email as creator_email, t.created_at,
         t.completed_at, t.completed_by, cb.full_name as completer_name,
         t.is_complete, t.escalated_at, t.last_ping_at, t.ping_count
    from tasks t
    left join properties p on p.id = t.property_id
    left join users c on c.id = t.created_by
    left join users cb on cb.id = t.completed_by`;

// Builds the §5 visibility predicate for `user`. Param order is fixed:
// $1 = allowed property ids (text[]), $2 = user id, $3 = user email. For
// super_admin the predicate is simply TRUE (sees everything).
async function visibilityClause(
  user: AppUser,
): Promise<{ clause: string; params: unknown[] }> {
  if (user.role === "super_admin") return { clause: "true", params: [] };

  const allowed = await getAllowedPropertyIds(user);
  const params: unknown[] = [allowed, user.id, user.email];

  let propertyBranch = "t.property_id = any($1)";
  if (user.role === "assistant_property_manager") {
    // APM sees everything below PM at their property (not PM-assigned tasks).
    propertyBranch += " and (t.job_function is null or t.job_function <> 'property_manager')";
  } else if (user.role === "staff") {
    // Staff see only their own tasks (routed to their address).
    propertyBranch += " and t.recipient_email = $3";
  }
  // read_only / property_manager / regional_manager: no extra narrowing — the
  // allowed-property set already scopes them (RM = region, PM = their property).

  // Standalone/corporate tasks: visible to the creator and the named recipient.
  const standalone = "(t.property_id is null and (t.created_by = $2 or t.recipient_email = $3))";

  return { clause: `((${propertyBranch}) or ${standalone})`, params };
}

export type TaskListFilter = { status?: "open" | "complete" | "all"; limit?: number };

export async function getVisibleTasks(user: AppUser, filter: TaskListFilter = {}): Promise<TaskRow[]> {
  const { clause, params } = await visibilityClause(user);
  let where = clause;
  if (filter.status === "open") where += " and t.is_complete = false";
  else if (filter.status === "complete") where += " and t.is_complete = true";

  const limit = Math.min(Math.max(filter.limit ?? 200, 1), 500);
  const sql = `${SELECT}
    where ${where}
    order by t.is_complete asc,
             case t.priority when 'high' then 0 when 'medium' then 1 else 2 end,
             t.created_at desc
    limit ${limit}`;
  const result = await query<TaskRow>(sql, params);
  return result.rows;
}

// A single task, but only if `user` may see it (else null). Same predicate as
// the list — never fetch a task for display/action without this gate.
export async function getTaskIfVisible(user: AppUser, taskId: string): Promise<TaskRow | null> {
  const { clause, params } = await visibilityClause(user);
  const sql = `${SELECT} where t.id = $${params.length + 1} and (${clause})`;
  const result = await query<TaskRow>(sql, [...params, taskId]);
  return result.rows[0] ?? null;
}

// Open tasks routed to the current user (their "my tasks" inbox).
export async function getMyOpenTasks(user: AppUser): Promise<TaskRow[]> {
  const sql = `${SELECT}
    where t.is_complete = false and t.recipient_email = $1
    order by case t.priority when 'high' then 0 when 'medium' then 1 else 2 end, t.created_at asc`;
  const result = await query<TaskRow>(sql, [user.email]);
  return result.rows;
}

// read_only can view but never act (CLAUDE.md §4a). Completion authority is
// otherwise equivalent to visibility (assignee + everyone above the assignee).
export function canActOnTasks(user: Pick<AppUser, "role">): boolean {
  return user.role !== "read_only";
}

export type TaskTarget = {
  propertyId: string | null;
  jobFunction: JobFunction | null;
  recipientEmail: string | null;
  label: string;
};

export type CreateTaskInput = {
  title: string;
  notes: string | null;
  priority: TaskPriority;
  cadence: PingCadence;
  escalationThreshold: number;
  targets: TaskTarget[];
};

// Create one task instance per target (fan-out, CLAUDE.md §6b). Siblings share
// an origin_id. Authorizes the creator (APM+ and access to each target's
// property; standalone requires super_admin). Returns the new task ids.
export async function createTasks(creator: AppUser, input: CreateTaskInput): Promise<string[]> {
  requireRole(creator, "assistant_property_manager");

  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  if (input.targets.length === 0) throw new Error("At least one assignee is required");

  const allowed = await getAllowedPropertyIds(creator);
  const allowedSet = new Set(allowed);
  const isSuperAdmin = creator.role === "super_admin";

  // Validate every target up-front (all-or-nothing).
  for (const target of input.targets) {
    if (target.propertyId === null) {
      if (!isSuperAdmin) throw new Error("Only a super admin can create a corporate/standalone task");
    } else if (!isSuperAdmin && !allowedSet.has(target.propertyId)) {
      throw new Error("You cannot assign a task to a property you don't manage");
    }
  }

  const originId = randomUUID();
  const threshold = Number.isFinite(input.escalationThreshold)
    ? Math.min(Math.max(Math.trunc(input.escalationThreshold), 1), 99)
    : 3;

  const created = await withTransaction(async (client) => {
    const ids: string[] = [];
    for (const target of input.targets) {
      let regionId: string | null = null;
      if (target.propertyId) {
        const r = await client.query<{ region_id: string }>(
          "select region_id from properties where id = $1",
          [target.propertyId],
        );
        regionId = r.rows[0]?.region_id ?? null;
      }
      const inserted = await client.query<{ id: string }>(
        `insert into tasks
           (origin_id, title, notes, priority, cadence, escalation_threshold,
            property_id, region_id, job_function, assignee_label, recipient_email, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         returning id`,
        [
          originId,
          title,
          input.notes?.trim() || null,
          input.priority,
          input.cadence,
          threshold,
          target.propertyId,
          regionId,
          target.jobFunction,
          target.label,
          target.recipientEmail?.trim() || null,
          creator.id,
        ],
      );
      ids.push(inserted.rows[0].id);
    }

    await writeAuditEntry(
      {
        actorUserId: creator.id,
        actorEmail: creator.email,
        action: "task.create",
        targetType: "task_origin",
        targetId: originId,
        detail: { title, instances: ids.length, targets: input.targets.map((t) => t.label) },
      },
      client,
    );
    return ids;
  });

  // Immediate ping on creation (outside the transaction — email is a network
  // call). No-ops cleanly until Resend is configured.
  await sendCreationPings(created);
  return created;
}

// Toggle completion. Authorizes (visible + not read_only), audits the toggle
// (§5), and on completion notifies the original creator (§6c).
export async function setTaskComplete(
  user: AppUser,
  taskId: string,
  complete: boolean,
): Promise<void> {
  const task = await getTaskIfVisible(user, taskId);
  if (!task) throw new Error("Task not found");
  if (!canActOnTasks(user)) throw new Error("Read-only users cannot change tasks");

  if (complete && task.is_complete) return; // already complete — no-op.
  if (!complete && !task.is_complete) return;

  if (complete) {
    await query(
      "update tasks set completed_at = now(), completed_by = $1, updated_at = now() where id = $2",
      [user.id, taskId],
    );
  } else {
    await query(
      "update tasks set completed_at = null, completed_by = null, updated_at = now() where id = $1",
      [taskId],
    );
  }

  await writeAuditEntry({
    actorUserId: user.id,
    actorEmail: user.email,
    action: complete ? "task.complete" : "task.reopen",
    targetType: "task",
    targetId: taskId,
    detail: { title: task.title, property: task.property_name },
  });

  // Notify the creator when a task is completed (skip if they completed it
  // themselves, and only if Resend is configured).
  if (complete && task.creator_email && task.created_by !== user.id) {
    await sendEmail({
      to: task.creator_email,
      subject: `Task complete: ${task.title}`,
      html:
        `<p><strong>${escapeHtml(task.title)}</strong> was marked complete` +
        `${task.property_name ? ` at ${escapeHtml(task.property_name)}` : ""} by ` +
        `${escapeHtml(user.fullName ?? user.email)}.</p>` +
        `<p><a href="${appUrl(`/tasks/${task.id}`)}">View the task</a></p>`,
    });
  }
}

// Edit a task's scalar fields (not its assignee/target — reassignment is a v1
// non-goal). Allowed for the creator or any property_manager-and-above who can
// see it. Audited.
export type UpdateTaskInput = {
  title: string;
  notes: string | null;
  priority: TaskPriority;
  cadence: PingCadence;
  escalationThreshold: number;
};

export async function updateTask(user: AppUser, taskId: string, input: UpdateTaskInput): Promise<void> {
  const task = await getTaskIfVisible(user, taskId);
  if (!task) throw new Error("Task not found");
  if (!canActOnTasks(user)) throw new Error("Read-only users cannot change tasks");
  if (task.created_by !== user.id && !hasRole(user, "property_manager")) {
    throw new Error("Only the creator or a property manager can edit this task");
  }
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  const threshold = Math.min(Math.max(Math.trunc(input.escalationThreshold), 1), 99);

  await query(
    `update tasks set title = $1, notes = $2, priority = $3, cadence = $4,
            escalation_threshold = $5, updated_at = now() where id = $6`,
    [title, input.notes?.trim() || null, input.priority, input.cadence, threshold, taskId],
  );
  await writeAuditEntry({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "task.update",
    targetType: "task",
    targetId: taskId,
    detail: { title },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const ROLE_CAN_CREATE: UserRole[] = [
  "assistant_property_manager",
  "property_manager",
  "regional_manager",
  "super_admin",
];
