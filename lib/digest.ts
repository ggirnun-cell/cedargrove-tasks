// SECURITY-CRITICAL adjacent (sends staff email). Server-only.
//
// The ping + escalation engine (CLAUDE.md §7). Consolidates each recipient's due
// tasks into ONE email, records a ping per task, and escalates tasks that reach
// their threshold to the property's regional manager + corporate (Geoff +
// Steve), or corporate only when the region has no RM (e.g. NC).
//
// Ping bookkeeping (ping_log, ping_count, last_ping_at) advances ONLY when the
// email actually sends, so when Resend isn't configured yet nothing escalates on
// phantom pings — it simply logs and skips.
import "server-only";
import { query } from "./db";
import { sendEmail, appUrl } from "./email";
import { optionalEnv } from "./env";
import { DUE_SQL } from "./schedule";

// Corporate escalation recipients (CLAUDE.md §7). Overridable via env so the
// addresses aren't hard-coded; defaults to the seeded partners.
function corporateEscalation(): string[] {
  const fromEnv = optionalEnv("ESCALATION_RECIPIENTS");
  if (fromEnv) return fromEnv.split(",").map((s) => s.trim()).filter(Boolean);
  return ["geoff@cedargrovecp.com", "steve@cedargrovecp.com"];
}

type DueRow = {
  id: string;
  title: string;
  priority: string;
  recipient_email: string;
  property_name: string | null;
};

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function taskListHtml(intro: string, tasks: { title: string; property_name: string | null; priority?: string }[]): string {
  const items = tasks
    .map(
      (t) =>
        `<li><strong>${esc(t.title)}</strong> — ${esc(t.property_name ?? "Corporate")}${
          t.priority ? ` · ${esc(t.priority)} priority` : ""
        }</li>`,
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;color:#1a1a1a">
    <p>${esc(intro)}</p>
    <ul>${items}</ul>
    <p><a href="${appUrl("/my-tasks")}" style="color:#B36629">Open the Cedar Grove task tracker</a></p>
  </div>`;
}

async function recordPing(taskId: string, recipient: string): Promise<void> {
  await query("insert into ping_log (task_id, recipient) values ($1, $2)", [taskId, recipient]);
  await query(
    "update tasks set ping_count = ping_count + 1, last_ping_at = now(), updated_at = now() where id = $1",
    [taskId],
  );
}

function groupByRecipient<T extends { recipient_email: string }>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(row.recipient_email) ?? [];
    list.push(row);
    groups.set(row.recipient_email, list);
  }
  return groups;
}

export type DigestResult = {
  due: number;
  recipientsEmailed: number;
  pingsSent: number;
  escalated: number;
};

// The daily job. Idempotent within a day: a task already pinged today won't be
// due again until its cadence elapses.
export async function runDailyDigest(): Promise<DigestResult> {
  // 1. Consolidated pings for due tasks.
  const due = await query<DueRow>(
    `select t.id, t.title, t.priority, t.recipient_email, p.name as property_name
       from tasks t
       left join properties p on p.id = t.property_id
      where t.is_complete = false and t.recipient_email is not null and ${DUE_SQL}
      order by t.recipient_email, t.created_at`,
  );

  let recipientsEmailed = 0;
  let pingsSent = 0;
  for (const [email, tasks] of groupByRecipient(due.rows)) {
    const res = await sendEmail({
      to: email,
      subject: `Your open Cedar Grove tasks (${tasks.length})`,
      html: taskListHtml("These tasks are open and waiting on you:", tasks),
    });
    if (res.sent) {
      recipientsEmailed++;
      for (const t of tasks) {
        await recordPing(t.id, email);
        pingsSent++;
      }
    }
  }

  // 2. Escalations: tasks that reached their threshold and aren't escalated yet.
  const escRows = await query<{
    id: string;
    title: string;
    property_name: string | null;
    regional_manager_email: string | null;
  }>(
    `select t.id, t.title, p.name as property_name, r.regional_manager_email
       from tasks t
       left join properties p on p.id = t.property_id
       left join regions r on r.id = t.region_id
      where t.is_complete = false and t.escalated_at is null
        and t.ping_count >= t.escalation_threshold`,
  );

  // Group by escalation recipient (RM if present + corporate; corporate-only for
  // regions without an RM, e.g. NC).
  const corporate = corporateEscalation();
  const escByRecipient = new Map<string, { id: string; title: string; property_name: string | null }[]>();
  for (const row of escRows.rows) {
    const recipients = new Set<string>(corporate);
    if (row.regional_manager_email) recipients.add(row.regional_manager_email);
    for (const recipient of recipients) {
      const list = escByRecipient.get(recipient) ?? [];
      list.push(row);
      escByRecipient.set(recipient, list);
    }
  }

  const escalatedTaskIds = new Set<string>();
  for (const [email, tasks] of escByRecipient) {
    const res = await sendEmail({
      to: email,
      subject: `Escalation: ${tasks.length} overdue Cedar Grove task(s)`,
      html: taskListHtml("These tasks have passed their escalation threshold and are still open:", tasks),
    });
    if (res.sent) for (const t of tasks) escalatedTaskIds.add(t.id);
  }
  for (const id of escalatedTaskIds) {
    await query("update tasks set escalated_at = now(), updated_at = now() where id = $1 and escalated_at is null", [id]);
  }

  return {
    due: due.rows.length,
    recipientsEmailed,
    pingsSent,
    escalated: escalatedTaskIds.size,
  };
}

// Immediate ping when tasks are created (Geoff's M6 requirement): notify each
// recipient once, listing the tasks just assigned to them, and start the cadence
// clock (ping #1). Only advances ping bookkeeping for tasks that actually send.
export async function sendCreationPings(taskIds: string[]): Promise<number> {
  if (taskIds.length === 0) return 0;
  const rows = await query<DueRow>(
    `select t.id, t.title, t.priority, t.recipient_email, p.name as property_name
       from tasks t
       left join properties p on p.id = t.property_id
      where t.id = any($1) and t.recipient_email is not null and t.last_ping_at is null`,
    [taskIds],
  );

  let pingsSent = 0;
  for (const [email, tasks] of groupByRecipient(rows.rows)) {
    const res = await sendEmail({
      to: email,
      subject:
        tasks.length === 1
          ? `New task: ${tasks[0].title}`
          : `${tasks.length} new Cedar Grove tasks assigned to you`,
      html: taskListHtml("You've just been assigned:", tasks),
    });
    if (res.sent) {
      for (const t of tasks) {
        await recordPing(t.id, email);
        pingsSent++;
      }
    }
  }
  return pingsSent;
}
