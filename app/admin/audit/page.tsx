// Audit log viewer. Reading the audit log is itself a sensitive read and is
// recorded (CLAUDE.md §12). Shows the most recent entries.
import { requireManageUsers } from "@/lib/auth";
import { writeAuditEntry } from "@/lib/audit";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type Row = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: unknown;
  created_at: string;
};

export default async function AuditPage() {
  const me = await requireManageUsers();

  const result = await query<Row>(
    `select id, actor_email, action, target_type, target_id, detail, created_at
       from audit_log order by created_at desc limit $1`,
    [PAGE_SIZE],
  );

  await writeAuditEntry({
    actorUserId: me.id,
    actorEmail: me.email,
    action: "admin.audit.view",
    targetType: "audit_log",
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-cg-green">Audit log</h1>
      <p className="mt-1 text-sm text-cg-ink/70">
        Most recent {PAGE_SIZE} sensitive actions. Every access change and admin view is recorded.
      </p>

      <div className="mt-5 overflow-x-auto rounded-md border border-cg-green/15 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cg-green/15 bg-cg-green/5 text-left text-xs uppercase tracking-wide text-cg-ink/60">
              <th className="px-4 py-2 font-medium">When (UTC)</th>
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((entry) => (
              <tr key={entry.id} className="border-b border-cg-green/10 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-cg-ink/60">
                  {new Date(entry.created_at).toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-4 py-2 text-xs text-cg-ink/80">{entry.actor_email ?? "system"}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-cg-green/10 px-1.5 py-0.5 font-mono text-xs text-cg-green">
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-cg-ink/70">
                  {entry.target_type}
                  {entry.target_id ? ` · ${entry.target_id}` : ""}
                </td>
              </tr>
            ))}
            {result.rowCount === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-cg-ink/50">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
